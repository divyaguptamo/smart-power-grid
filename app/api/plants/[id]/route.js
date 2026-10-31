import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson } from '@/lib/validate';

// Operators update live generation or take a plant offline.
// The CHECK constraint chk_plant_generation rejects generation above capacity.
export const PATCH = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Plant id', { min: 1, integer: true });
  const b = await readJson(req);
  const sets = [];
  const vals = [];
  if (b.current_generation_mw !== undefined) {
    sets.push('current_generation_mw = ?');
    vals.push(num(b.current_generation_mw, 'Current generation', { min: 0 }));
  }
  if (b.status !== undefined) {
    sets.push('status = ?');
    vals.push(oneOf(b.status, 'Status', ['ACTIVE', 'OFFLINE', 'MAINTENANCE']));
  }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  const r = await query(`UPDATE POWER_PLANT SET ${sets.join(', ')} WHERE plant_id = ?`, [...vals, id]);
  if (!r.affectedRows) throw new HttpError(404, 'Power plant not found.');
  return NextResponse.json({ ok: true });
});
