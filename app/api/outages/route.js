import { NextResponse } from 'next/server';
import { api, EVERYONE } from '@/lib/auth';
import { query } from '@/lib/db';
import { getMongoDb } from '@/lib/mongo';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

// Staff see every outage; consumers see outages in the zones where their meters are.
export const GET = api(EVERYONE, async (req, ctx, session) => {
  const status = oneOf(req.nextUrl.searchParams.get('status') || null, 'Status', ['ACTIVE', 'RESOLVED'], { optional: true });
  const where = [];
  const vals = [];
  if (status) { where.push('o.status = ?'); vals.push(status); }
  if (session.role === 'CONSUMER') {
    where.push('o.zone_id IN (SELECT zone_id FROM vw_consumer_meters WHERE user_id = ?)');
    vals.push(session.userId);
  }
  const outages = await query(
    `SELECT o.outage_id, o.zone_id, gz.zone_name, o.start_time, o.end_time, o.reason, o.severity, o.status,
            u.name AS reported_by_name,
            TIMESTAMPDIFF(MINUTE, o.start_time, COALESCE(o.end_time, NOW())) AS duration_min
     FROM OUTAGE o
     JOIN GRID_ZONE gz ON gz.zone_id = o.zone_id
     JOIN \`USER\` u ON u.user_id = o.reported_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY o.status = 'ACTIVE' DESC, o.start_time DESC`,
    vals
  );

  // which zones the user may report for
  const zones = session.role === 'CONSUMER'
    ? await query('SELECT DISTINCT zone_id, zone_name FROM vw_consumer_meters WHERE user_id = ? ORDER BY zone_name', [session.userId])
    : await query('SELECT zone_id, zone_name FROM GRID_ZONE ORDER BY zone_name');

  return NextResponse.json({ outages, zones });
});

export const POST = api(EVERYONE, async (req, ctx, session) => {
  const b = await readJson(req);
  const zoneId = num(b.zone_id, 'Zone', { min: 1, integer: true });
  const severity = oneOf(b.severity, 'Severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  const reason = str(b.reason, 'Description', { min: 5, max: 255 });

  if (session.role === 'CONSUMER') {
    const [own] = await query('SELECT 1 FROM vw_consumer_meters WHERE user_id = ? AND zone_id = ? LIMIT 1', [session.userId, zoneId]);
    if (!own) throw new HttpError(403, 'You can only report outages in your own zone.');
  }

  // trg_outage_after_insert marks the zone as OUTAGE
  const r = await query(
    `INSERT INTO OUTAGE (zone_id, reported_by, start_time, reason, severity, status)
     VALUES (?, ?, NOW(), ?, ?, 'ACTIVE')`,
    [zoneId, session.userId, reason, severity]
  );

  try {
    const db = await getMongoDb();
    await db.collection('grid_events').insertOne({
      ts: new Date(), type: 'OUTAGE_REPORTED', severity, zone_id: zoneId, source: 'APP',
      message: reason, payload: { outage_id: r.insertId, reported_by: session.userId, role: session.role },
      acknowledged: false,
    });
  } catch (e) { console.warn('grid_events insert skipped:', e.message); }

  return NextResponse.json({ outage_id: r.insertId }, { status: 201 });
});
