import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './session';
import { toErrorResponse } from './errors';

export const ROLES = { ADMIN: 'ADMIN', OPERATOR: 'OPERATOR', CONSUMER: 'CONSUMER' };
export const STAFF = [ROLES.ADMIN, ROLES.OPERATOR];
export const EVERYONE = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.CONSUMER];

export async function getSession() {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * Wraps a route handler with authentication, role-based authorisation
 * and uniform error handling.
 *   export const GET = api(STAFF, async (req, ctx, session) => {...})
 * Pass null as roles for a public endpoint.
 */
export function api(roles, handler) {
  return async (req, ctx) => {
    try {
      const session = await getSession();
      if (roles) {
        if (!session) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
        if (!roles.includes(session.role)) {
          return NextResponse.json({ error: 'Your role does not have access to this action.' }, { status: 403 });
        }
      }
      return await handler(req, ctx, session);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
