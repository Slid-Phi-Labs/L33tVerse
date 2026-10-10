import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const AGENT_RIDER_URL =
  process.env.AGENT_RIDER_URL || "https://agentrider.fly.dev";

export async function POST() {
  const started = Date.now();
  let upstream: any = null;
  let ok = false;
  let error: string | null = null;

  try {
    const res = await fetch(`${AGENT_RIDER_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    upstream = await res.json().catch(() => ({}));
    ok = res.ok;
  } catch (e: any) {
    error = e?.message || "upstream unreachable";
    ok = false;
  }

  const latency_ms = Date.now() - started;

  const existing = await query(
    `SELECT id FROM agents WHERE external_id = $1 LIMIT 1`,
    ["agent-rider-primary"]
  );

  let agentId: string | null = existing.rows[0]?.id ?? null;

  if (existing.db && !agentId) {
    const inserted = await query(
      `INSERT INTO agents (external_id, name, status, last_seen, meta)
       VALUES ($1, $2, $3, now(), $4)
       RETURNING id`,
      [
        "agent-rider-primary",
        "Agent-Rider Primary",
        ok ? "healthy" : "unhealthy",
        JSON.stringify({ source: "poll" }),
      ]
    );
    agentId = inserted.rows[0]?.id ?? null;
  } else if (existing.db && agentId) {
    await query(
      `UPDATE agents SET status = $1, last_seen = now() WHERE id = $2`,
      [ok ? "healthy" : "unhealthy", agentId]
    );
  }

  if (existing.db && agentId) {
    await query(
      `INSERT INTO health_checks (agent_id, check_type, ok, latency_ms, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        agentId,
        "upstream_health",
        ok,
        latency_ms,
        JSON.stringify({ upstream, error }),
      ]
    );

    if (!ok) {
      await query(
        `INSERT INTO alerts (agent_id, severity, message)
         VALUES ($1, $2, $3)`,
        [agentId, "critical", error || "Agent-Rider health check failed"]
      );
    }
  }

  return NextResponse.json({
    ok,
    latency_ms,
    agent_id: agentId,
    persisted: Boolean(existing.db && agentId),
    error,
    checked_at: new Date().toISOString(),
  });
}
