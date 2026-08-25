import { NextResponse } from "next/server";

/**
 * MVP alerts list.
 * Later: read from Postgres `alerts` table.
 */
export async function GET() {
  const alerts: any[] = [];
  return NextResponse.json({ alerts, count: 0, unacknowledged: 0 });
}
