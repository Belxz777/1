import { db } from "../database";
import { settings } from "../database/schema";
import { eq } from "drizzle-orm";

const ADMIN_PASSWORD_KEY = "admin_password_hash";

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function getAdminPasswordHash(): Promise<string | null> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.key, ADMIN_PASSWORD_KEY))
    .get();
  return row?.value ?? null;
}

export async function setAdminPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  await db
    .insert(settings)
    .values({ key: ADMIN_PASSWORD_KEY, value: hash })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: hash },
    });
}

export async function isAdminRegistered(): Promise<boolean> {
  const hash = await getAdminPasswordHash();
  return hash !== null;
}
