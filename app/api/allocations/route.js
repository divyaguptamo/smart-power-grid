import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query, withConnection } from '@/lib/db';
import { num, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const SORTS = {
  newest: 'ea.allocation_time DESC',
  oldest: 'ea.allocation_time ASC',
  power: 'ea.allocated_power_mw DESC',
  priority: 'ea.priority_level DESC, ea.allocation_time DESC',
};

export const GET = api(STAFF, async (req) => {
  const sp = req.nextUrl.searchParams;
  const where = [];
  const vals = [];
  const status = oneOf(sp.get('status') || null, 'Status', ['PENDING', 'APPROVED', 'COMPLETED'], { optional: true });
  if (status) { where.push('ea.status = ?'); vals.push(status); }
  if (sp.get('zone_id')) { where.push('ea.zone_id = ?'); vals.push(num(sp.get('zone_id'), 'Zone', { integer: true })); }
  if (sp.get('plant_id')) { where.push('ea.plant_id = ?'); vals.push(num(sp.get('plant_id'), 'Plant', { integer: true })); }
  const orderBy = SORTS[sp.get('sort')] || SORTS.newest; // allow-listed, never user text

  const allocations = await query(
    `SELECT ea.allocation_id, ea.plant_id, pp.plant_name, pp.plant_type,
            ea.zone_id, gz.zone_name, gz.zone_type,
            ea.allocated_power_mw, ea.allocation_time, ea.priority_level, ea.status, ea.notes,
            COALESCE(SUM(ra.power_contributed_mw), 0)              AS backup_mw,
            GROUP_CONCAT(er.resource_name ORDER BY er.resource_name SEPARATOR ', ') AS backup_resources,
            (SELECT COUNT(*) FROM ALLOCATION_LOG l WHERE l.allocation_id = ea.allocation_id) AS change_count
     FROM ENERGY_ALLOCATION ea
     JOIN POWER_PLANT pp ON pp.plant_id = ea.plant_id
     JOIN GRID_ZONE gz  ON gz.zone_id  = ea.zone_id
     LEFT JOIN RESOURCE_ALLOCATION ra ON ra.allocation_id = ea.allocation_id
     LEFT JOIN ENERGY_RESOURCE er     ON er.resource_id   = ra.resource_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     GROUP BY ea.allocation_id
     ORDER BY ${orderBy}`,
    vals
  );
  return NextResponse.json({ allocations });
});

// Create an allocation through the transactional stored procedure sp_allocate_power
export const POST = api(STAFF, async (req, ctx, session) => {
  const b = await readJson(req);
  const params = [
    num(b.plant_id, 'Plant', { min: 1, integer: true }),
    num(b.zone_id, 'Zone', { min: 1, integer: true }),
    num(b.allocated_power_mw, 'Power', { min: 0.01, max: 100000 }),
    num(b.priority_level, 'Priority', { min: 1, max: 5, integer: true }),
    session.userId,
    str(b.notes, 'Notes', { max: 500, optional: true }),
  ];
  const allocationId = await withConnection(async (conn) => {
    await conn.query('CALL sp_allocate_power(?, ?, ?, ?, ?, ?, @aid)', params);
    const [[row]] = await conn.query('SELECT @aid AS id');
    return row.id;
  });
  return NextResponse.json({ allocation_id: allocationId }, { status: 201 });
});
