import { NextResponse } from 'next/server';
import { api, EVERYONE, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMongoDb } from '@/lib/mongo';
import { HttpError } from '@/lib/errors';
import { num, readJson } from '@/lib/validate';
import { sinceDays, usagePipeline } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

// Usage analytics for one meter (or all of the consumer's meters) from MongoDB.
export const GET = api(EVERYONE, async (req, ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const days = num(sp.get('days') || 30, 'Days', { min: 1, max: 365, integer: true });
  const meterParam = sp.get('meter_id') ? num(sp.get('meter_id'), 'Meter', { min: 1, integer: true }) : null;

  // SQL decides which meters this user may see; MongoDB only stores the readings.
  const meters = session.role === 'CONSUMER'
    ? await query('SELECT meter_id, zone_id, zone_name, meter_type, meter_status, address FROM vw_consumer_meters WHERE user_id = ?', [session.userId])
    : await query('SELECT meter_id, zone_id, zone_name, meter_type, meter_status, address, consumer_name FROM vw_consumer_meters');

  let ids = meters.map((m) => m.meter_id);
  if (meterParam) {
    if (!ids.includes(meterParam)) throw new HttpError(403, 'You do not have access to this meter.');
    ids = [meterParam];
  }
  if (!ids.length) return NextResponse.json({ meters, daily: [], hourly: [], summary: null, days });

  const db = await getMongoDb();
  const [res] = await db.collection('meter_readings').aggregate(usagePipeline(ids, sinceDays(days))).toArray();

  return NextResponse.json({ meters, days, daily: res.daily, hourly: res.hourly, summary: res.summary[0] || null });
});

// Ingest a reading (staff / meter gateway). Meter metadata is copied from SQL so both stores agree.
export const POST = api(STAFF, async (req) => {
  const b = await readJson(req);
  const meterId = num(b.meter_id, 'Meter', { min: 1, integer: true });
  const [meter] = await query('SELECT meter_id, zone_id, consumer_id, meter_status FROM vw_consumer_meters WHERE meter_id = ?', [meterId]);
  if (!meter) throw new HttpError(404, 'Meter not found.');
  if (meter.meter_status !== 'ACTIVE') throw new HttpError(422, 'Readings can only be recorded for ACTIVE meters.');

  const doc = {
    ts: b.ts ? new Date(b.ts) : new Date(),
    meta: { meter_id: meter.meter_id, zone_id: meter.zone_id, consumer_id: meter.consumer_id },
    kwh: num(b.kwh, 'kWh', { min: 0, max: 10000 }),
    voltage: num(b.voltage, 'Voltage', { min: 0, max: 500 }),
    current_a: num(b.current_a ?? 0, 'Current', { min: 0, max: 5000 }),
    power_factor: num(b.power_factor ?? 0.95, 'Power factor', { min: 0, max: 1 }),
    quality: 'OK',
  };
  if (Number.isNaN(doc.ts.getTime())) throw new HttpError(400, 'Timestamp is invalid.');

  const db = await getMongoDb();
  await db.collection('meter_readings').insertOne(doc);
  return NextResponse.json({ ok: true }, { status: 201 });
});
