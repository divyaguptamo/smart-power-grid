import { NextResponse } from 'next/server';
import { api, EVERYONE } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = api(EVERYONE, async (req, ctx, session) => {
  const meters = session.role === 'CONSUMER'
    ? await query('SELECT * FROM vw_consumer_meters WHERE user_id = ? ORDER BY meter_id', [session.userId])
    : await query('SELECT * FROM vw_consumer_meters ORDER BY zone_name, meter_id');
  return NextResponse.json({ meters });
});
