import { NextRequest, NextResponse } from "next/server";

const ADMIN_CODE = process.env.ADMIN_CODE || "lab-owner-change-me";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body?.code || body.code !== ADMIN_CODE) {
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    role: "admin",
    plan: "admin",
    billing_bypass: true,
  });
}
