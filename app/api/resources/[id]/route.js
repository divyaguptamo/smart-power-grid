import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson } from '@/lib/validate';

export const PATCH = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Resource id', { min: 1, integer: true });
  const b = await readJson(req);
  const sets = [];
  const vals = [];
  if (b.available_power_mw !== undefined) {
    sets.push('available_power_mw = ?');
    vals.push(num(b.available_power_mw, 'Available power', { min: 0 }));
  }
  if (b.status !== undefined) {
    sets.push('status = ?');
    vals.push(oneOf(b.status, 'Status', ['AVAILABLE', 'IN_USE', 'MAINTENANCE']));
  }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  const r = await query(`UPDATE ENERGY_RESOURCE SET ${sets.join(', ')} WHERE resource_id = ?`, [...vals, id]);
  if (!r.affectedRows) throw new HttpError(404, 'Resource not found.');
  return NextResponse.json({ ok: true });
});

// Foreign keys (RESOURCE_ALLOCATION, MAINTENANCE) block deleting a resource that is in use -> 409
export const DELETE = api(['ADMIN'], async (req, { params }) => {
  const id = num(params.id, 'Resource id', { min: 1, integer: true });
  const r = await query('DELETE FROM ENERGY_RESOURCE WHERE resource_id = ?', [id]);
  if (!r.affectedRows) throw new HttpError(404, 'Resource not found.');
  return NextResponse.json({ ok: true });
});
