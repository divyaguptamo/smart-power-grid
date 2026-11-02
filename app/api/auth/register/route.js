import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { api } from '@/lib/auth';
import { query, withConnection } from '@/lib/db';
import { EMAIL, PHONE, num, oneOf, readJson, str } from '@/lib/validate';
import { getMongoDb } from '@/lib/mongo';

// Zones a new consumer can be connected to (public: needed by the sign-up form)
export const GET = api(null, async () => {
  const zones = await query(
    "SELECT zone_id, zone_name, zone_type FROM GRID_ZONE WHERE zone_type <> 'CRITICAL' ORDER BY zone_name"
  );
  return NextResponse.json({ zones });
});

// Consumer self-registration: USER + CONSUMER + METER in one stored-procedure transaction
export const POST = api(null, async (req) => {
  const b = await readJson(req);
  const name = str(b.name, 'Name', { min: 2, max: 100 });
  const email = str(b.email, 'Email', { max: 150, pattern: EMAIL }).toLowerCase();
  const password = str(b.password, 'Password', { min: 8, max: 128 });
  const phone = str(b.phone, 'Phone', { pattern: PHONE, optional: true });
  const type = oneOf(b.consumer_type, 'Connection type', ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']);
  const address = str(b.address, 'Address', { min: 5, max: 255 });
  const zoneId = num(b.zone_id, 'Zone', { min: 1, integer: true });

  const hash = await bcrypt.hash(password, 10);

  const userId = await withConnection(async (conn) => {
    await conn.query('CALL sp_register_consumer(?, ?, ?, ?, ?, ?, ?, @uid)', [
      name, email, hash, phone, type, address, zoneId,
    ]);
    const [[row]] = await conn.query('SELECT @uid AS user_id');
    return row.user_id;
  });

  // Record the new connection as a grid event (best effort - SQL is the source of truth)
  try {
    const db = await getMongoDb();
    await db.collection('grid_events').insertOne({
      ts: new Date(), type: 'NEW_CONNECTION', severity: 'INFO', zone_id: zoneId, source: 'APP',
      message: `New ${type.toLowerCase()} connection registered`,
      payload: { user_id: userId, consumer_type: type }, acknowledged: true,
    });
  } catch (e) { console.warn('grid_events insert skipped:', e.message); }

  return NextResponse.json({ user_id: userId }, { status: 201 });
});
