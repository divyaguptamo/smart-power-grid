import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { withConnection } from '@/lib/db';
import { getMongoDb } from '@/lib/mongo';
import { num } from '@/lib/validate';

export const POST = api(STAFF, async (req, { params }, session) => {
  const id = num(params.id, 'Outage id', { min: 1, integer: true });
  await withConnection((conn) => conn.query('CALL sp_resolve_outage(?)', [id]));
  try {
    const db = await getMongoDb();
    await db.collection('grid_events').updateMany(
      { type: 'OUTAGE_REPORTED', 'payload.outage_id': id },
      { $set: { acknowledged: true, acknowledged_by: session.userId, acknowledged_at: new Date() } }
    );
  } catch (e) { console.warn('grid_events update skipped:', e.message); }
  return NextResponse.json({ ok: true });
});
