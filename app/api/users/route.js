import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { api } from '@/lib/auth';
import { query } from '@/lib/db';
import { EMAIL, PHONE, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = api(['ADMIN'], async () => {
  const users = await query(
    `SELECT u.user_id, u.name, u.email, u.role, u.phone, u.status, u.created_at,
            c.consumer_type, c.address,
            (SELECT COUNT(*) FROM ALLOCATION_LOG l WHERE l.changed_by = u.user_id) AS changes_made
     FROM \`USER\` u LEFT JOIN CONSUMER c ON c.user_id = u.user_id
     ORDER BY FIELD(u.role, 'ADMIN', 'OPERATOR', 'CONSUMER'), u.name`
  );
  return NextResponse.json({ users });
});

// Admins create staff accounts (consumers sign up themselves)
export const POST = api(['ADMIN'], async (req) => {
  const b = await readJson(req);
  const password = str(b.password, 'Password', { min: 8, max: 128 });
  const r = await query(
    "INSERT INTO `USER` (name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
    [
      str(b.name, 'Name', { min: 2, max: 100 }),
      str(b.email, 'Email', { max: 150, pattern: EMAIL }).toLowerCase(),
      await bcrypt.hash(password, 10),
      oneOf(b.role, 'Role', ['ADMIN', 'OPERATOR']),
      str(b.phone, 'Phone', { pattern: PHONE, optional: true }),
    ]
  );
  return NextResponse.json({ user_id: r.insertId }, { status: 201 });
});
