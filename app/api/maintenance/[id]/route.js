import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, oneOf, readJson } from '@/lib/validate';

// trg_maintenance_status switches the plant to MAINTENANCE / back to ACTIVE
export const PATCH = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Maintenance id', { min: 1, integer: true });
  const b = await readJson(req);
  const status = oneOf(b.status, 'Status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']);
  const r = await query(
    `UPDATE MAINTENANCE
     SET status = ?, completion_date = IF(? = 'COMPLETED', GREATEST(CURDATE(), scheduled_date), NULL)
     WHERE maintenance_id = ?`,
    [status, status, id]
  );
  if (!r.affectedRows) throw new HttpError(404, 'Maintenance job not found.');
  return NextResponse.json({ ok: true });
});

// Only jobs that have not started can be cancelled
export const DELETE = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Maintenance id', { min: 1, integer: true });
  const r = await query("DELETE FROM MAINTENANCE WHERE maintenance_id = ? AND status = 'SCHEDULED'", [id]);
  if (!r.affectedRows) throw new HttpError(409, 'Only scheduled jobs that have not started can be cancelled.');
  return NextResponse.json({ ok: true });
});
