// src/database/connection.ts

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'cadence.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    console.log(`📦 Database connected: ${DB_PATH}`);
  }
  return db;
}

export function query<T>(sql: string, params: unknown[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return stmt.all(...params) as T[];
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  return (stmt.get(...params) as T) || null;
}

export function execute(sql: string, params: unknown[] = []): { changes: number } {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return { changes: result.changes };
}

export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * CRITICAL: Atomic update to prevent race conditions
 * Only updates if ALL conditions are met
 * Returns true if row was updated, false otherwise
 */
export function atomicUpdate(
  table: string,
  setValues: Record<string, unknown>,
  whereConditions: Record<string, unknown>
): boolean {
  const setClauses: string[] = [];
  const whereClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(setValues)) {
    setClauses.push(`${key} = ?`);
    params.push(value);
  }

  // Add updated_at
  setClauses.push(`updated_at = datetime('now')`);

  for (const [key, value] of Object.entries(whereConditions)) {
    if (value === null) {
      whereClauses.push(`${key} IS NULL`);
    } else {
      whereClauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
  const result = execute(sql, params);
  return result.changes > 0;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
