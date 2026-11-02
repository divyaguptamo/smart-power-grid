// Creates the MongoDB collections (with validators and indexes) and loads sample telemetry.
// Meters are read from MySQL so both databases describe the same grid.
//   npm run seed:mongo        (uses .env.local)
import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';

const DAYS = 30;
const TZ_OFFSET_MIN = 330; // IST, used for daily load shapes

// small deterministic random generator so every team member gets the same data
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

function loadShape(type, hour, weekday) {
  if (type === 'COMMERCIAL') {
    const open = hour >= 9 && hour < 20;
    return (open ? 1.0 : 0.18) * (weekday === 0 ? 0.35 : 1) * 9.5; // kWh per hour
  }
  if (type === 'INDUSTRIAL') return (hour >= 6 && hour < 22 ? 1 : 0.6) * 40;
  // residential: morning and evening peaks
  const base = 0.35;
  const morning = Math.exp(-((hour - 8) ** 2) / 3) * 1.1;
  const evening = Math.exp(-((hour - 20) ** 2) / 4) * 1.9;
  return (base + morning + evening) * (weekday === 0 || weekday === 6 ? 1.15 : 1);
}

async function main() {
  const { MONGODB_URI, MONGODB_DB = 'smart_grid_telemetry' } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set (did you create .env.local?)');

  const sql = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
  });
  const [meters] = await sql.query(
    `SELECT m.meter_id, m.zone_id, m.consumer_id, c.consumer_type
     FROM METER m JOIN CONSUMER c ON c.consumer_id = m.consumer_id WHERE m.status = 'ACTIVE'`
  );
  const [plants] = await sql.query('SELECT plant_id, plant_type FROM POWER_PLANT');
  const [zones] = await sql.query('SELECT zone_id FROM GRID_ZONE');
  await sql.end();

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(MONGODB_DB);

  for (const name of ['meter_readings', 'grid_events']) {
    if ((await db.listCollections({ name }).toArray()).length) await db.collection(name).drop();
  }

  // ---- meter_readings: time-series collection --------------------------------
  // MongoDB does not allow $jsonSchema validators on time-series collections, so the
  // reading shape is validated in the only write path (POST /api/readings).
  await db.createCollection('meter_readings', {
    timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'hours' },
  });
  await db.collection('meter_readings').createIndexes([
    { key: { 'meta.meter_id': 1, ts: -1 }, name: 'meter_time' },
    { key: { 'meta.zone_id': 1, ts: -1 }, name: 'zone_time' },
  ]);

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const start = new Date(now.getTime() - DAYS * 24 * 3600 * 1000);
  const readings = [];
  for (const m of meters) {
    for (let t = start.getTime(); t <= now.getTime(); t += 3600 * 1000) {
      const local = new Date(t + TZ_OFFSET_MIN * 60 * 1000);
      const hour = local.getUTCHours();
      const weekday = local.getUTCDay();
      const kwh = Math.max(0.05, loadShape(m.consumer_type, hour, weekday) * (1 + 0.15 * gauss()));
      let voltage = 230 + 3.5 * gauss() - (kwh > 2.5 && m.consumer_type === 'RESIDENTIAL' ? 6 : 0);
      if (rand() < 0.01) voltage -= 18; // occasional sag
      const pf = Math.min(0.999, 0.93 + 0.04 * gauss());
      readings.push({
        ts: new Date(t),
        meta: { meter_id: m.meter_id, zone_id: m.zone_id, consumer_id: m.consumer_id },
        kwh: +kwh.toFixed(3),
        voltage: +voltage.toFixed(1),
        current_a: +((kwh * 1000) / (voltage * pf)).toFixed(2),
        power_factor: +pf.toFixed(3),
        quality: rand() < 0.02 ? 'ESTIMATED' : 'OK',
      });
    }
  }
  if (readings.length) await db.collection('meter_readings').insertMany(readings, { ordered: false });

  // ---- grid_events: flexible event log ---------------------------------------
  await db.createCollection('grid_events', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['ts', 'type', 'severity', 'source', 'acknowledged'],
        properties: {
          ts: { bsonType: 'date' },
          type: { bsonType: 'string' },
          severity: { enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          zone_id: { bsonType: ['int', 'null'] },
          plant_id: { bsonType: ['int', 'null'] },
          source: { enum: ['SCADA', 'METER', 'PLANT', 'APP'] },
          message: { bsonType: 'string' },
          payload: { bsonType: 'object' }, // shape depends on the event type
          acknowledged: { bsonType: 'bool' },
        },
      },
    },
  });
  await db.collection('grid_events').createIndexes([
    { key: { zone_id: 1, ts: -1 }, name: 'zone_time' },
    { key: { acknowledged: 1, ts: -1 }, name: 'open_events' },
    { key: { type: 1, severity: 1 }, name: 'type_severity' },
    { key: { message: 'text' }, name: 'message_text' },
  ]);

  const zoneIds = zones.map((z) => z.zone_id);
  // meter-sourced events can only come from zones that actually have meters
  const meterZones = meters.length ? [...new Set(meters.map((m) => m.zone_id))] : zoneIds;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const makers = [
    () => ({ type: 'VOLTAGE_SAG', severity: pick(['LOW', 'MEDIUM']), source: 'METER', zone_id: pick(meterZones),
             message: 'Voltage dropped below the 216 V limit',
             payload: { min_voltage: +(200 + rand() * 15).toFixed(1), duration_s: Math.round(5 + rand() * 120) } }),
    () => ({ type: 'OVERLOAD_WARNING', severity: pick(['MEDIUM', 'HIGH']), source: 'SCADA', zone_id: pick(zoneIds),
             message: 'Feeder loading above 90 percent of rating',
             payload: { feeder: `F-${Math.ceil(rand() * 12)}`, load_pct: +(90 + rand() * 12).toFixed(1) } }),
    () => ({ type: 'FREQUENCY_DEVIATION', severity: 'HIGH', source: 'SCADA', zone_id: null,
             message: 'Grid frequency outside 49.9-50.05 Hz band',
             payload: { frequency_hz: +(49.7 + rand() * 0.15).toFixed(3), window_s: 60 } }),
    () => {
      const p = pick(plants);
      return { type: 'RENEWABLE_DIP', severity: 'MEDIUM', source: 'PLANT', zone_id: null, plant_id: p.plant_id,
               message: `${p.plant_type.toLowerCase()} output fell sharply`,
               payload: { plant_type: p.plant_type, drop_mw: +(10 + rand() * 40).toFixed(1), cause: pick(['cloud cover', 'low wind', 'curtailment']) } };
    },
    () => ({ type: 'TRANSFORMER_TEMP', severity: pick(['MEDIUM', 'HIGH', 'CRITICAL']), source: 'SCADA', zone_id: pick(zoneIds),
             message: 'Transformer oil temperature high',
             payload: { transformer: `TR-${Math.ceil(rand() * 30)}`, oil_temp_c: +(85 + rand() * 20).toFixed(1), threshold_c: 90 } }),
    () => ({ type: 'METER_TAMPER', severity: 'LOW', source: 'METER', zone_id: pick(meterZones),
             message: 'Meter cover opened',
             payload: { meter_id: meters.length ? pick(meters).meter_id : null, sensor: 'cover_switch' } }),
  ];
  const events = [];
  for (let i = 0; i < 60; i++) {
    const e = pick(makers)();
    const ts = new Date(now.getTime() - rand() * DAYS * 24 * 3600 * 1000);
    const recent = now - ts < 3 * 24 * 3600 * 1000;
    events.push({ ts, plant_id: null, ...e, acknowledged: !(recent && rand() < 0.6) });
  }
  await db.collection('grid_events').insertMany(events);

  console.log(`meter_readings: ${readings.length} documents for ${meters.length} meters`);
  console.log(`grid_events:    ${events.length} documents`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
