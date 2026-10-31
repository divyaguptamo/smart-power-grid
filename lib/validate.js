import { HttpError } from './errors';

// Application-level validation. The database enforces the same rules again
// (CHECK constraints, triggers, procedures), so bad data cannot slip in either way.

export function str(value, label, { min = 1, max = 255, pattern, optional = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (optional) return null;
    throw new HttpError(400, `${label} is required.`);
  }
  const s = String(value).trim();
  if (s.length < min) throw new HttpError(400, `${label} must be at least ${min} characters.`);
  if (s.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  if (pattern && !pattern.test(s)) throw new HttpError(400, `${label} has an invalid format.`);
  return s;
}

export function num(value, label, { min = -Infinity, max = Infinity, optional = false, integer = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw new HttpError(400, `${label} is required.`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${label} must be a number.`);
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `${label} must be a whole number.`);
  if (n < min || n > max) throw new HttpError(400, `${label} must be between ${min} and ${max}.`);
  return n;
}

export function oneOf(value, label, options, { optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return null;
  if (!options.includes(value)) throw new HttpError(400, `${label} must be one of: ${options.join(', ')}.`);
  return value;
}

export function date(value, label, { optional = false } = {}) {
  if (!value) {
    if (optional) return null;
    throw new HttpError(400, `${label} is required.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `${label} must be a date (YYYY-MM-DD).`);
  }
  return value;
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE = /^[6-9]\d{9}$/;
