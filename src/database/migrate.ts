import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./index";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function runMigrations() {
  const migrationsFolder = join(import.meta.dir, "../drizzle");

  if (!existsSync(join(migrationsFolder, "meta/_journal.json"))) {
    console.warn("[DB] Папка миграций не найдена, пропускаем. Запусти: bun drizzle-kit generate");
    return;
  }

  await migrate(db, { migrationsFolder });
  console.log("[DB] Миграции применены");
}