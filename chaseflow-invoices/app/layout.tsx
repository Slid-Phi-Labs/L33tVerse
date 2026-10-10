export const metadata = {
  title: "ChaseFlow",
  description: "Automated invoice chasing for freelancers and agencies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
