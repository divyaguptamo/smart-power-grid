import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { num, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const TYPES = ['BATTERY', 'GENERATOR', 'RESERVE', 'STORAGE'];
const STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE'];

export const GET = api(STAFF, async (req) => {
  const sp = req.nextUrl.searchParams;
  const q = str(sp.get('q'), 'Search', { max: 100, optional: true });
  const type = oneOf(sp.get('type') || null, 'Type', TYPES, { optional: true });
  const status = oneOf(sp.get('status') || null, 'Status', STATUSES, { optional: true });

  const where = [];
  const vals = [];
  let relevance = '0';
  if (q) {
    // FULLTEXT index ft_resource_search (resource_name, location), boolean mode with prefix match
    const terms = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean).map((t) => `${t}*`).join(' ');
    if (terms) {
      where.push('MATCH(resource_name, location) AGAINST(? IN BOOLEAN MODE)');
      vals.push(terms);
      relevance = 'MATCH(resource_name, location) AGAINST(? IN BOOLEAN MODE)';
    }
  }
  if (type) { where.push('resource_type = ?'); vals.push(type); }
  if (status) { where.push('status = ?'); vals.push(status); }

  const relVals = relevance === '0' ? [] : [vals[0]];
  const resources = await query(
    `SELECT resource_id, resource_name, resource_type, capacity_mw, available_power_mw, location, status,
            ROUND(available_power_mw / NULLIF(capacity_mw, 0) * 100, 1) AS available_pct,
            ${relevance} AS relevance
     FROM ENERGY_RESOURCE
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY relevance DESC, resource_name`,
    [...relVals, ...vals]
  );
  return NextResponse.json({ resources });
});

export const POST = api(['ADMIN'], async (req) => {
  const b = await readJson(req);
  const capacity = num(b.capacity_mw, 'Capacity', { min: 0, max: 100000 });
  const r = await query(
    `INSERT INTO ENERGY_RESOURCE (resource_name, resource_type, capacity_mw, available_power_mw, location, status)
     VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
    [
      str(b.resource_name, 'Name', { min: 3, max: 150 }),
      oneOf(b.resource_type, 'Type', TYPES),
      capacity,
      num(b.available_power_mw ?? capacity, 'Available power', { min: 0 }),
      str(b.location, 'Location', { max: 200, optional: true }),
    ]
  );
  return NextResponse.json({ resource_id: r.insertId }, { status: 201 });
});
