import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const { rows, db } = await query(
    `SELECT id, external_id, name, status, last_seen, meta, created_at
     FROM agents
     ORDER BY created_at DESC
     LIMIT 100`
  );

  if (db && rows.length > 0) {
    return NextResponse.json({ agents: rows, count: rows.length, source: "db" });
  }

  // Fallback placeholder when DB is empty or not configured
  const agents = [
    {
      id: "local-placeholder",
      external_id: "agent-rider-primary",
      name: "Agent-Rider Primary",
      status: "unknown",
      last_seen: null,
      meta: { source: "placeholder" },
    },
  ];

  return NextResponse.json({
    agents,
    count: agents.length,
    source: db ? "db-empty" : "placeholder",
  });
}
