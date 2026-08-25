import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const { rows, db } = await query(
    `SELECT id, agent_id, severity, message, acknowledged, created_at
     FROM alerts
     ORDER BY created_at DESC
     LIMIT 100`
  );

  const alerts = db ? rows : [];
  const unacknowledged = alerts.filter((a: any) => !a.acknowledged).length;

  return NextResponse.json({
    alerts,
    count: alerts.length,
    unacknowledged,
    source: db ? "db" : "placeholder",
  });
}
