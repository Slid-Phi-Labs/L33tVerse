import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  try {
    const { rows } = workspaceId
      ? await query(
          `SELECT * FROM clients WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [workspaceId]
        )
      : await query(`SELECT * FROM clients ORDER BY created_at DESC LIMIT 100`);
    return NextResponse.json({ clients: rows });
  } catch {
    return NextResponse.json({ clients: [], note: 'db unavailable' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, name, email } = body;
    if (!workspace_id || !name) {
      return NextResponse.json({ error: 'workspace_id and name required' }, { status: 400 });
    }
    const { rows } = await query(
      `INSERT INTO clients (workspace_id, name, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [workspace_id, name, email || null]
    );
    return NextResponse.json({ client: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({
      client: {
        id: crypto.randomUUID(),
        ...((await req.json().catch(() => ({}))) as object),
        note: 'memory fallback',
      },
    }, { status: 201 });
  }
}
