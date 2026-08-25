import Link from "next/link";

async function getHealth() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    return res.json();
  } catch {
    return { ok: false, error: "health fetch failed" };
  }
}

async function getAgents() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/agents`, { cache: "no-store" });
    return res.json();
  } catch {
    return { agents: [], count: 0 };
  }
}

async function getAlerts() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/alerts`, { cache: "no-store" });
    return res.json();
  } catch {
    return { alerts: [], count: 0, unacknowledged: 0 };
  }
}

export default async function DashboardPage() {
  const [health, agentsData, alertsData] = await Promise.all([
    getHealth(),
    getAgents(),
    getAlerts(),
  ]);

  const statusColor = health?.ok ? "#3fb950" : "#f85149";

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Agent-Rider Operator</h1>
        <p style={{ color: "#8b949e", marginTop: 6 }}>
          Single pane for Agent-Rider + CuNi health
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <Card title="Upstream health">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: statusColor,
                display: "inline-block",
              }}
            />
            <strong>{health?.ok ? "OK" : "Down / unreachable"}</strong>
          </div>
          <div style={{ color: "#8b949e", fontSize: 14, marginTop: 8 }}>
            {health?.latency_ms != null ? `${health.latency_ms} ms` : "—"}
            {health?.upstream_status != null && ` · status ${health.upstream_status}`}
          </div>
          {health?.error && (
            <div style={{ color: "#f85149", fontSize: 13, marginTop: 6 }}>
              {health.error}
            </div>
          )}
        </Card>

        <Card title="Agents">
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {agentsData?.count ?? 0}
          </div>
          <div style={{ color: "#8b949e", fontSize: 14 }}>tracked</div>
        </Card>

        <Card title="Alerts">
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {alertsData?.unacknowledged ?? 0}
          </div>
          <div style={{ color: "#8b949e", fontSize: 14 }}>unacknowledged</div>
        </Card>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Agents</h2>
        <div
          style={{
            border: "1px solid #21262d",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {(agentsData?.agents || []).length === 0 ? (
            <div style={{ padding: 16, color: "#8b949e" }}>No agents yet.</div>
          ) : (
            (agentsData.agents as any[]).map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #21262d",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ color: "#8b949e", fontSize: 13 }}>
                    {a.external_id || a.id}
                  </div>
                </div>
                <div style={{ color: "#8b949e", fontSize: 13 }}>{a.status}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>API</h2>
        <ul style={{ color: "#8b949e", lineHeight: 1.8 }}>
          <li>
            <Link href="/api/health" style={{ color: "#58a6ff" }}>
              GET /api/health
            </Link>
          </li>
          <li>
            <Link href="/api/agents" style={{ color: "#58a6ff" }}>
              GET /api/agents
            </Link>
          </li>
          <li>
            <Link href="/api/alerts" style={{ color: "#58a6ff" }}>
              GET /api/alerts
            </Link>
          </li>
        </ul>
      </section>

      <footer style={{ color: "#484f58", fontSize: 13 }}>
        L33tSaaS Labs · Claimed exclusive · Operator Dashboard
      </footer>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #21262d",
        borderRadius: 10,
        padding: "1rem 1.1rem",
      }}
    >
      <div style={{ color: "#8b949e", fontSize: 13, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
