import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
let pool: Pool | null = null;

export function getPool() {
  if (!connectionString) return null;
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}

export async function query<T = any>(text: string, params?: any[]) {
  const p = getPool();
  if (!p) return { rows: [] as T[], rowCount: 0, db: false as const };
  const result = await p.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0, db: true as const };
}
