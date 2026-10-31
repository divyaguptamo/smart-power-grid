import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query, withConnection } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson, str } from '@/lib/validate';

export const PATCH = api(STAFF, async (req, { params }, session) => {
  const id = num(params.id, 'Allocation id', { min: 1, integer: true });
  const b = await readJson(req);

  // Power change: stored procedure (transaction) + trigger writes the audit row
  if (b.allocated_power_mw !== undefined) {
    const power = num(b.allocated_power_mw, 'Power', { min: 0.01, max: 100000 });
    const reason = str(b.reason, 'Reason', { min: 3, max: 255 });
    await withConnection((conn) =>
      conn.query('CALL sp_update_allocation_power(?, ?, ?, ?)', [id, power, session.userId, reason])
    );
    return NextResponse.json({ ok: true });
  }

  // Status change: trg_allocation_before_update only lets status move forward
  if (b.status !== undefined) {
    const status = oneOf(b.status, 'Status', ['PENDING', 'APPROVED', 'COMPLETED']);
    const r = await query('UPDATE ENERGY_ALLOCATION SET status = ? WHERE allocation_id = ?', [status, id]);
    if (!r.affectedRows) throw new HttpError(404, 'Allocation not found.');
    return NextResponse.json({ ok: true });
  }
  throw new HttpError(400, 'Nothing to update.');
});
