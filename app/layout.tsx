export const metadata = {
  title: "Agent-Rider Operator",
  description: "Operator dashboard for Agent-Rider + CuNi health",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#0b0f14",
          color: "#e6edf3",
        }}
      >
        {children}
      </body>
    </html>
  );
}
