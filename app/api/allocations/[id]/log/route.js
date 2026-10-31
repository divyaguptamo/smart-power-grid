import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { num } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Allocation id', { min: 1, integer: true });
  const log = await query(
    `SELECT l.log_id, l.old_power_mw, l.new_power_mw, l.changed_at, l.reason, u.name AS changed_by_name, u.role
     FROM ALLOCATION_LOG l JOIN \`USER\` u ON u.user_id = l.changed_by
     WHERE l.allocation_id = ? ORDER BY l.changed_at DESC, l.log_id DESC`,
    [id]
  );
  return NextResponse.json({ log });
});
