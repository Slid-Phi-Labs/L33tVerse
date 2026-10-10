import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem" }}>ChaseFlow</h1>
        <p style={{ color: "#8b949e", marginTop: 6 }}>
          Automated invoice chasing + cash-flow forecast
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
        <Card title="Invoices">
          <code style={{ fontSize: 13 }}>POST /api/invoices</code>
          <div style={{ color: "#8b949e", fontSize: 13, marginTop: 6 }}>
            create + list by workspace
          </div>
        </Card>
        <Card title="Chase sequence">
          <code style={{ fontSize: 13 }}>POST /api/chase</code>
          <div style={{ color: "#8b949e", fontSize: 13, marginTop: 6 }}>
            3-step email sequence (day 0 / 3 / 7)
          </div>
        </Card>
        <Card title="Forecast">
          <code style={{ fontSize: 13 }}>GET /api/forecast</code>
          <div style={{ color: "#8b949e", fontSize: 13, marginTop: 6 }}>
            outstanding vs paid cash-flow
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>API</h2>
        <ul style={{ color: "#8b949e", lineHeight: 1.9 }}>
          <li>
            <Link href="/api/invoices?workspace_id=demo" style={{ color: "#58a6ff" }}>
              GET /api/invoices?workspace_id=demo
            </Link>
          </li>
          <li>
            <Link href="/api/forecast?workspace_id=demo" style={{ color: "#58a6ff" }}>
              GET /api/forecast?workspace_id=demo
            </Link>
          </li>
        </ul>
      </section>

      <footer style={{ color: "#484f58", fontSize: 13 }}>
        L33tSaaS Labs · Claimed exclusive · ChaseFlow
      </footer>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #21262d",
        borderRadius: 10,
        padding: "1rem 1.1rem",
      }}
    >
      <div style={{ color: "#8b949e", fontSize: 13, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
