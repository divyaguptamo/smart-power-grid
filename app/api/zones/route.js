import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async () => {
  const zones = await query('SELECT * FROM vw_zone_load ORDER BY priority_level DESC, zone_name');
  return NextResponse.json({ zones });
});
