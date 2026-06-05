import { Database } from "bun:sqlite";
import { drizzle }  from "drizzle-orm/bun-sqlite";
import { migrate }  from "drizzle-orm/bun-sqlite/migrator";
import { mkdir }    from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { env }      from "../config";
import * as schema  from "./schema";

const DB_PATH = env.server.isTest
  ? ":memory:"                  // in-memory, сбрасывается после каждого запуска
  : env.db.path ?? "./data/xpanel.db";

console.log("[DB] Initializing database at:", DB_PATH);

if (!env.server.isTest) {
  try {
    await mkdir(dirname(DB_PATH), { recursive: true });
  } catch (e) {
    console.error("[DB] Failed to create directory for database:", e);
    throw e;
  }
}

let sqlite: Database;
try {
  sqlite = new Database(DB_PATH);
} catch (e) {
  console.error("[DB] Failed to open database:", e);
  throw e;
}

try { sqlite.run("PRAGMA journal_mode = DELETE;"); } catch {}
try { sqlite.run("PRAGMA foreign_keys = ON;"); } catch {}
try { sqlite.run("PRAGMA busy_timeout = 5000;"); } catch {}

export const db = drizzle(sqlite, { schema, logger: true });
export type DB = typeof db;

// Автоматически применяем миграции при инициализации БД
const migrationsFolder = join(import.meta.dir, "../drizzle");
if (existsSync(join(migrationsFolder, "meta/_journal.json"))) {
  await migrate(db, { migrationsFolder });
  console.log("[DB] Migrations applied");
} else {
  console.warn("[DB] Папка миграций не найдена, пропускаем. Запусти: bun drizzle-kit generate");
}