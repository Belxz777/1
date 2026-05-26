import { Database } from "bun:sqlite";
import { drizzle }  from "drizzle-orm/bun-sqlite";
import { mkdir }    from "node:fs/promises";
import { dirname }  from "node:path";
import { env }      from "../config";
import * as schema  from "./schema";

const DB_PATH = env.server.isTest
  ? ":memory:"                  // in-memory, сбрасывается после каждого запуска
  : env.db.path ?? "./data/xpanel.db";

await mkdir(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");
sqlite.run("PRAGMA busy_timeout = 5000;");  // избегаем SQLITE_BUSY

export const db = drizzle(sqlite, { schema, logger:true });
export type DB = typeof db;