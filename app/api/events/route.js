import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { getMongoDb } from '@/lib/mongo';
import { num, oneOf, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async (req) => {
  const sp = req.nextUrl.searchParams;
  const filter = {};
  const severity = oneOf(sp.get('severity') || null, 'Severity', ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], { optional: true });
  if (severity) filter.severity = severity;
  if (sp.get('zone_id')) filter.zone_id = num(sp.get('zone_id'), 'Zone', { integer: true });
  if (sp.get('open') === '1') filter.acknowledged = false;
  const q = str(sp.get('q'), 'Search', { max: 100, optional: true });
  if (q) filter.$text = { $search: q }; // text index on message

  const db = await getMongoDb();
  const events = await db.collection('grid_events')
    .find(filter, { projection: { _id: 0, id: { $toString: '$_id' }, ts: 1, type: 1, severity: 1, zone_id: 1,
                                  plant_id: 1, source: 1, message: 1, payload: 1, acknowledged: 1 } })
    .sort({ ts: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json({ events });
});
