import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { date, num, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async () => {
  const [maintenance, plants, resources, staff] = await Promise.all([
    query(
      `SELECT m.maintenance_id, m.maintenance_type, m.scheduled_date, m.completion_date, m.status, m.description,
              m.plant_id, m.resource_id,
              COALESCE(pp.plant_name, er.resource_name) AS target_name,
              IF(m.plant_id IS NOT NULL, 'Plant', 'Resource') AS target_kind,
              u.name AS performed_by_name
       FROM MAINTENANCE m
       LEFT JOIN POWER_PLANT pp     ON pp.plant_id = m.plant_id
       LEFT JOIN ENERGY_RESOURCE er ON er.resource_id = m.resource_id
       JOIN \`USER\` u ON u.user_id = m.performed_by
       ORDER BY FIELD(m.status, 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED'), m.scheduled_date`
    ),
    query('SELECT plant_id, plant_name FROM POWER_PLANT ORDER BY plant_name'),
    query('SELECT resource_id, resource_name FROM ENERGY_RESOURCE ORDER BY resource_name'),
    query("SELECT user_id, name FROM `USER` WHERE role IN ('ADMIN','OPERATOR') AND status = 'ACTIVE' ORDER BY name"),
  ]);
  return NextResponse.json({ maintenance, plants, resources, staff });
});

export const POST = api(STAFF, async (req) => {
  const b = await readJson(req);
  const plantId = num(b.plant_id, 'Plant', { integer: true, optional: true });
  const resourceId = num(b.resource_id, 'Resource', { integer: true, optional: true });
  if (!plantId === !resourceId) throw new HttpError(400, 'Choose either a plant or a resource.');
  const r = await query(
    `INSERT INTO MAINTENANCE (plant_id, resource_id, maintenance_type, scheduled_date, status, performed_by, description)
     VALUES (?, ?, ?, ?, 'SCHEDULED', ?, ?)`,
    [
      plantId, resourceId,
      oneOf(b.maintenance_type, 'Type', ['ROUTINE', 'REPAIR', 'EMERGENCY']),
      date(b.scheduled_date, 'Scheduled date'),
      num(b.performed_by, 'Assigned to', { min: 1, integer: true }),
      str(b.description, 'Description', { max: 500, optional: true }),
    ]
  );
  return NextResponse.json({ maintenance_id: r.insertId }, { status: 201 });
});
