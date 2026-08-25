export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 720 }}>
      <h1>Agent-Rider Operator</h1>
      <p>Single pane for Agent-Rider + CuNi health.</p>
      <ul>
        <li>
          <a href="/api/health">/api/health</a> — live upstream check
        </li>
        <li>
          <a href="/api/agents">/api/agents</a>
        </li>
        <li>
          <a href="/api/alerts">/api/alerts</a>
        </li>
      </ul>
      <p style={{ color: "#666", marginTop: "2rem" }}>
        L33tSaaS Labs · Claimed exclusive
      </p>
    </main>
  );
}
