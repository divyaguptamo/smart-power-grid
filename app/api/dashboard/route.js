import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMongoDb } from '@/lib/mongo';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async () => {
  const [zones, plants, [totals], allocationStatus, recentChanges] = await Promise.all([
    query('SELECT * FROM vw_zone_load ORDER BY priority_level DESC, zone_name'),
    // view + stored function from the DML phase
    query(`SELECT h.*, CalculatePlantUtilization(h.plant_id) AS utilization_pct
           FROM vw_plant_headroom h ORDER BY h.capacity_mw DESC`),
    query(`SELECT
             (SELECT SUM(capacity_mw) FROM POWER_PLANT WHERE status = 'ACTIVE')            AS online_capacity_mw,
             (SELECT SUM(current_generation_mw) FROM POWER_PLANT)                         AS generation_mw,
             (SELECT SUM(current_demand_mw) FROM GRID_ZONE)                               AS demand_mw,
             (SELECT SUM(available_power_mw) FROM ENERGY_RESOURCE WHERE status = 'AVAILABLE') AS reserve_mw,
             (SELECT COUNT(*) FROM OUTAGE WHERE status = 'ACTIVE')                        AS active_outages,
             (SELECT COUNT(*) FROM ENERGY_ALLOCATION WHERE status = 'PENDING')            AS pending_allocations,
             (SELECT COUNT(*) FROM MAINTENANCE WHERE status <> 'COMPLETED')               AS open_maintenance`),
    query(`SELECT status, COUNT(*) AS count, SUM(allocated_power_mw) AS total_mw
           FROM ENERGY_ALLOCATION GROUP BY status ORDER BY FIELD(status,'PENDING','APPROVED','COMPLETED')`),
    query(`SELECT l.log_id, l.allocation_id, l.old_power_mw, l.new_power_mw, l.changed_at, l.reason,
                  u.name AS changed_by_name, gz.zone_name
           FROM ALLOCATION_LOG l
           JOIN \`USER\` u ON u.user_id = l.changed_by
           JOIN ENERGY_ALLOCATION ea ON ea.allocation_id = l.allocation_id
           JOIN GRID_ZONE gz ON gz.zone_id = ea.zone_id
           ORDER BY l.changed_at DESC, l.log_id DESC LIMIT 6`),
  ]);

  // Unacknowledged events from MongoDB. If MongoDB is down the SQL dashboard still loads.
  let events = { available: false, unacknowledged: 0, latest: [] };
  try {
    const db = await getMongoDb();
    const [res] = await db.collection('grid_events').aggregate([
      { $match: { acknowledged: false } },
      { $sort: { ts: -1 } },
      { $facet: {
          count: [{ $count: 'n' }],
          latest: [{ $limit: 5 }, { $project: { _id: 0, id: { $toString: '$_id' }, ts: 1, type: 1, severity: 1, zone_id: 1, message: 1 } }],
      } },
    ]).toArray();
    events = { available: true, unacknowledged: res.count[0]?.n || 0, latest: res.latest };
  } catch (e) {
    console.warn('MongoDB unavailable for dashboard:', e.message);
  }

  return NextResponse.json({ zones, plants, totals, allocationStatus, recentChanges, events });
});
