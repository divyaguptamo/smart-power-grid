import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { api, STAFF } from '@/lib/auth';
import { getMongoDb } from '@/lib/mongo';
import { HttpError } from '@/lib/errors';

export const PATCH = api(STAFF, async (req, { params }, session) => {
  if (!ObjectId.isValid(params.id)) throw new HttpError(400, 'Invalid event id.');
  const db = await getMongoDb();
  const r = await db.collection('grid_events').updateOne(
    { _id: new ObjectId(params.id) },
    { $set: { acknowledged: true, acknowledged_by: session.userId, acknowledged_at: new Date() } }
  );
  if (!r.matchedCount) throw new HttpError(404, 'Event not found.');
  return NextResponse.json({ ok: true });
});
