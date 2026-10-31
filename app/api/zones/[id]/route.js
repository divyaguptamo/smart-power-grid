import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { num, readJson, str } from '@/lib/validate';

// Update the measured demand of a zone. Status follows the load unless the zone is in outage.
export const PATCH = api(STAFF, async (req, { params }) => {
  const id = num(params.id, 'Zone id', { min: 1, integer: true });
  const b = await readJson(req);
  const demand = num(b.current_demand_mw, 'Current demand', { min: 0, max: 100000 });
  const level = str(b.reported_level, 'Reported level', { max: 50, optional: true });

  const r = await query(
    `UPDATE GRID_ZONE
     SET current_demand_mw = ?,
         reported_level = COALESCE(?, reported_level),
         status = CASE
                    WHEN status = 'OUTAGE' THEN 'OUTAGE'
                    WHEN current_demand_mw > allocated_power_mw
                      OR allocated_power_mw >= 0.9 * max_capacity_mw THEN 'HIGH_DEMAND'
                    ELSE 'NORMAL'
                  END
     WHERE zone_id = ?`,
    [demand, level, id]
  );
  if (!r.affectedRows) throw new HttpError(404, 'Zone not found.');
  return NextResponse.json({ ok: true });
});
