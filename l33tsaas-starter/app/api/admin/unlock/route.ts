import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const code = body.code
  const expected = process.env.ADMIN_CODE || 'lab-owner-change-me'

  if (!code || code !== expected) {
    return NextResponse.json({ error: 'invalid code' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    role: 'admin',
    plan: 'admin',
    billing_bypass: true,
  })
}
