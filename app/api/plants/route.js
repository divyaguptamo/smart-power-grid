import { NextResponse } from 'next/server';
import { api, STAFF } from '@/lib/auth';
import { query } from '@/lib/db';
import { date, num, oneOf, readJson, str } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = api(STAFF, async () => {
  const plants = await query(
    `SELECT h.*, p.commissioned_date, CalculatePlantUtilization(h.plant_id) AS utilization_pct
     FROM vw_plant_headroom h JOIN POWER_PLANT p ON p.plant_id = h.plant_id
     ORDER BY h.plant_name`
  );
  return NextResponse.json({ plants });
});

export const POST = api(['ADMIN'], async (req) => {
  const b = await readJson(req);
  const capacity = num(b.capacity_mw, 'Capacity', { min: 0.01, max: 100000 });
  const values = [
    str(b.plant_name, 'Plant name', { min: 3, max: 150 }),
    oneOf(b.plant_type, 'Plant type', ['SOLAR', 'WIND', 'HYDRO', 'THERMAL']),
    str(b.location, 'Location', { max: 200 }),
    capacity,
    num(b.current_generation_mw ?? 0, 'Current generation', { min: 0, max: capacity }),
    date(b.commissioned_date, 'Commissioned date', { optional: true }),
  ];
  const result = await query(
    `INSERT INTO POWER_PLANT (plant_name, plant_type, location, capacity_mw, current_generation_mw, status, commissioned_date)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    values
  );
  return NextResponse.json({ plant_id: result.insertId }, { status: 201 });
});
