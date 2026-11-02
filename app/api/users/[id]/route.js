import { NextResponse } from 'next/server';
import { api } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson } from '@/lib/validate';

export const PATCH = api(['ADMIN'], async (req, { params }, session) => {
  const id = num(params.id, 'User id', { min: 1, integer: true });
  const b = await readJson(req);
  const status = oneOf(b.status, 'Status', ['ACTIVE', 'INACTIVE']);
  if (id === session.userId && status === 'INACTIVE') throw new HttpError(400, 'You cannot deactivate your own account.');
  const r = await query('UPDATE `USER` SET status = ? WHERE user_id = ?', [status, id]);
  if (!r.affectedRows) throw new HttpError(404, 'User not found.');
  return NextResponse.json({ ok: true });
});
