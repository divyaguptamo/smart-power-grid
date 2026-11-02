import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMongoDb } from '@/lib/mongo';
import { num } from '@/lib/validate';
import { TZ, VOLTAGE_MAX, VOLTAGE_MIN, sinceDays } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async (req) => {
  const days = num(req.nextUrl.searchParams.get('days') || 14, 'Days', { min: 1, max: 90, integer: true });
  const since = sinceDays(days);
  const db = await getMongoDb();

  const [[usage], [events], zones, meters] = await Promise.all([
    db.collection('meter_readings').aggregate([
      { $match: { ts: { $gte: since } } },
      { $facet: {
          // energy per zone per day
          zoneDaily: [
            { $group: { _id: { zone: '$meta.zone_id', day: { $dateTrunc: { date: '$ts', unit: 'day', timezone: TZ } } },
                        kwh: { $sum: '$kwh' } } },
            { $sort: { '_id.day': 1 } },
            { $project: { _id: 0, zone_id: '$_id.zone', kwh: { $round: ['$kwh', 1] },
                          day: { $dateToString: { date: '$_id.day', format: '%Y-%m-%d', timezone: TZ } } } },
          ],
          // the busiest hour of the day in each zone
          peakHour: [
            { $group: { _id: { zone: '$meta.zone_id', hour: { $hour: { date: '$ts', timezone: TZ } } }, avg: { $avg: '$kwh' } } },
            { $sort: { '_id.zone': 1, avg: -1 } },
            { $group: { _id: '$_id.zone', hour: { $first: '$_id.hour' }, avg_kwh: { $first: '$avg' } } },
            { $project: { _id: 0, zone_id: '$_id', hour: 1, avg_kwh: { $round: ['$avg_kwh', 3] } } },
          ],
          // highest-consuming meters
          topMeters: [
            { $group: { _id: '$meta.meter_id', kwh: { $sum: '$kwh' } } },
            { $sort: { kwh: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, meter_id: '$_id', kwh: { $round: ['$kwh', 1] } } },
          ],
          // supply-quality: readings outside the +/-6 % voltage band, per zone
          voltage: [
            { $group: { _id: '$meta.zone_id', readings: { $sum: 1 },
                        issues: { $sum: { $cond: [{ $or: [{ $lt: ['$voltage', VOLTAGE_MIN] }, { $gt: ['$voltage', VOLTAGE_MAX] }] }, 1, 0] } },
                        min_v: { $min: '$voltage' }, max_v: { $max: '$voltage' } } },
            { $project: { _id: 0, zone_id: '$_id', readings: 1, issues: 1, min_v: 1, max_v: 1,
                          issue_pct: { $round: [{ $multiply: [{ $divide: ['$issues', '$readings'] }, 100] }, 2] } } },
          ],
      } },
    ]).toArray(),
    db.collection('grid_events').aggregate([
      { $match: { ts: { $gte: since } } },
      { $facet: {
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
          byZone: [{ $match: { zone_id: { $ne: null } } }, { $group: { _id: '$zone_id', count: { $sum: 1 } } }],
      } },
    ]).toArray(),
    query('SELECT zone_id, zone_name, zone_type FROM GRID_ZONE'),
    query('SELECT meter_id, consumer_name, zone_name FROM vw_consumer_meters'),
  ]);

  // Join the MongoDB results with names from MySQL in the API layer
  const zoneName = Object.fromEntries(zones.map((z) => [z.zone_id, z.zone_name]));
  const meterInfo = Object.fromEntries(meters.map((m) => [m.meter_id, m]));
  const named = (rows) => rows.map((r) => ({ ...r, zone_name: zoneName[r.zone_id] || `Zone ${r.zone_id}` }));

  return NextResponse.json({
    days,
    zoneDaily: named(usage.zoneDaily),
    peakHour: named(usage.peakHour),
    voltage: named(usage.voltage),
    topMeters: usage.topMeters.map((m) => ({ ...m, ...(meterInfo[m.meter_id] || {}) })),
    events: {
      byType: events.byType.map((e) => ({ type: e._id, count: e.count })),
      bySeverity: events.bySeverity.map((e) => ({ severity: e._id, count: e.count })),
      byZone: named(events.byZone.map((e) => ({ zone_id: e._id, count: e.count }))),
    },
  });
});
