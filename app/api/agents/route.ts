import { NextResponse } from "next/server";

/**
 * MVP agents list.
 * Later: read from Postgres `agents` table + merge live health.
 */
export async function GET() {
  // Placeholder until DB is wired. Structure matches schema.
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

  return NextResponse.json({ agents, count: agents.length });
}
