import { NextResponse } from 'next/server';
import { getStripeStatus } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getStripeStatus());
}
