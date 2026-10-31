import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Friendly text for database CHECK constraints, so the UI explains what to fix.
const CHECK_MESSAGES = {
  chk_user_password_bcrypt: 'Passwords must be stored as bcrypt hashes.',
  chk_user_email: 'Enter a valid email address.',
  chk_user_phone: 'Phone must be a 10-digit Indian mobile number.',
  chk_zone_priority: 'Priority must be between 1 and 5.',
  chk_zone_capacity: 'Zone capacity must be greater than 0 MW.',
  chk_zone_demand: 'Demand cannot be negative.',
  chk_zone_allocated: 'Zone allocation cannot exceed its maximum capacity.',
  chk_plant_capacity: 'Plant capacity must be greater than 0 MW.',
  chk_plant_generation: 'Generation must be between 0 and the plant capacity.',
  chk_allocation_power: 'Allocated power must be greater than 0 MW.',
  chk_allocation_priority: 'Priority must be between 1 and 5.',
  chk_resource_capacity: 'Capacity cannot be negative.',
  chk_resource_available: 'Available power must be between 0 and the resource capacity.',
  chk_outage_time: 'An outage cannot end before it starts.',
  chk_maintenance_target: 'Maintenance must target either a plant or a resource, not both.',
  chk_maintenance_dates: 'Completion date cannot be before the scheduled date.',
};

/** Convert any thrown error (validation, MySQL, MongoDB) into a JSON response. */
export function toErrorResponse(err) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  // SIGNAL SQLSTATE '45000' from our triggers and stored procedures
  if (err?.sqlState === '45000') {
    return NextResponse.json({ error: err.sqlMessage }, { status: 422 });
  }
  if (err?.errno === 3819) {
    const name = (err.sqlMessage.match(/'([^']+)'/) || [])[1];
    return NextResponse.json(
      { error: CHECK_MESSAGES[name] || 'A database rule rejected this value.', constraint: name },
      { status: 422 }
    );
  }
  if (err?.errno === 1062) {
    return NextResponse.json({ error: 'A record with this value already exists.' }, { status: 409 });
  }
  if (err?.errno === 1451 || err?.errno === 1217) {
    return NextResponse.json(
      { error: 'This record is still referenced by other records and cannot be deleted.' },
      { status: 409 }
    );
  }
  if (err?.errno === 1452 || err?.errno === 1216) {
    return NextResponse.json({ error: 'A referenced record does not exist.' }, { status: 422 });
  }
  if (err?.errno === 1265 || err?.errno === 1366 || err?.errno === 1406) {
    return NextResponse.json({ error: 'One of the values has the wrong format or is too long.' }, { status: 422 });
  }
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 });
}
