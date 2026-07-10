import initSqlJs, { type Database } from "sql.js";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
      const res = await fetch("/data/slitting_planner.db");
      const buf = new Uint8Array(await res.arrayBuffer());
      return new SQL.Database(buf);
    })();
  }
  return dbPromise;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params as never);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}
