import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { api } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { readJson, str } from '@/lib/validate';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export const POST = api(null, async (req) => {
  const body = await readJson(req);
  const email = str(body.email, 'Email', { max: 150 }).toLowerCase();
  const password = str(body.password, 'Password', { max: 128 });

  const [user] = await query(
    'SELECT user_id, name, email, password_hash, role, status FROM `USER` WHERE email = ?',
    [email]
  );
  // Same message for unknown email and wrong password, so accounts cannot be enumerated.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  if (user.status !== 'ACTIVE') throw new HttpError(403, 'This account has been deactivated. Contact an administrator.');

  const token = await createSessionToken(user);
  const res = NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
});
