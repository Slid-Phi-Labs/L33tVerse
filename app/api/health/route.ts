import { NextResponse } from "next/server";

const AGENT_RIDER_URL =
  process.env.AGENT_RIDER_URL || "https://agentrider.fly.dev";

export async function GET() {
  const started = Date.now();
  try {
    const res = await fetch(`${AGENT_RIDER_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const latency_ms = Date.now() - started;
    const body = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      source: "agent-rider",
      latency_ms,
      upstream_status: res.status,
      data: body,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "agent-rider",
        latency_ms: Date.now() - started,
        error: err?.message || "upstream unreachable",
        checked_at: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
