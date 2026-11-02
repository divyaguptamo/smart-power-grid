import { NextResponse } from 'next/server';
import { api, EVERYONE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = api(EVERYONE, async (req, ctx, session) => NextResponse.json({ user: session }));
