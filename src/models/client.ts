import { eq, and, sql } from "drizzle-orm";
import { t } from "elysia";
import { db } from "../database";
import { clients, trafficStats } from "../database/schema";
import type { Client, NewClient } from "../database/schema";

// ─── Elysia validation schemas ───────────────────────────────────────────────

export const ClientCreateSchema = t.Object({
  id:                   t.String({ format: "uuid",    description: "UUID клиента" }),
  inbound_id:           t.Number({ minimum: 1 }),
  email:                t.String({ minLength: 1, maxLength: 255 }),
  enabled:              t.Optional(t.Boolean()),
  total_upload_limit:   t.Optional(t.Number({ minimum: 0, default: 0 })),
  total_download_limit: t.Optional(t.Number({ minimum: 0, default: 0 })),
  expiry_time:          t.Optional(t.Number({ minimum: 0, default: 0 })),
});

export const ClientUpdateSchema = t.Partial(
  t.Object({
    email:                t.String({ minLength: 1, maxLength: 255 }),
    enabled:              t.Boolean(),
    total_upload_limit:   t.Number({ minimum: 0 }),
    total_download_limit: t.Number({ minimum: 0 }),
    expiry_time:          t.Number({ minimum: 0 }),
  })
);

export const ClientParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

// ─── Бизнес-логика ────────────────────────────────────────────────────────────

/** Истёк ли срок действия клиента */
function isExpired(client: Client): boolean {
  return client.expiryTime !== 0 && Date.now() > (client.expiryTime ?? 0) * 1000;
}

/** Превышен ли лимит трафика */
function isTrafficExceeded(client: Client): boolean {
  const uploadExceeded =
    client.totalUploadLimit !== 0 &&
    (client.totalUploadUsed ?? 0) >= (client.totalUploadLimit ?? 0);

const downloadExceeded =
  client.totalDownloadLimit !== 0 &&
  (client.totalDownloadUsed ?? 0) >= (client.totalDownloadLimit ?? 0);


  return uploadExceeded || downloadExceeded;
}

/** Активен ли клиент (включён, не истёк, трафик не превышен) */
function isActive(client: Client): boolean {
  return !!client.enabled && !isExpired(client) && !isTrafficExceeded(client);
}

// ─── Слой данных ──────────────────────────────────────────────────────────────

export const ClientModel = {

  // ── CREATE ──────────────────────────────────────────────────────────────────

  async create(data: NewClient): Promise<Client> {
    const [created] = await db
      .insert(clients)
      .values({
        ...data,
        enabled:            data.enabled              ?? true,
        totalUploadLimit:   data.totalUploadLimit     ?? 0,
        totalDownloadLimit: data.totalDownloadLimit   ?? 0,
        totalUploadUsed:    0,
        totalDownloadUsed:  0,
        expiryTime:         data.expiryTime           ?? 0,
      })
      .returning();

    return created;
  },

  // ── READ ─────────────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Client | undefined> {
    return db.query.clients.findFirst({
      where: eq(clients.id, id),
    });
  },

  async getByEmail(email: string): Promise<Client | undefined> {
    return db.query.clients.findFirst({
      where: eq(clients.email, email),
    });
  },

  async getAllByInbound(inboundId: number): Promise<Client[]> {
    return db.select()
      .from(clients)
      .where(eq(clients.inboundId, inboundId));
  },

  /** Клиенты с данными inbound (relational query) */
  async getWithInbound(id: string) {
    return db.query.clients.findFirst({
      where: eq(clients.id, id),
      with:  { inbound: true },
    });
  },

  // ── UPDATE ───────────────────────────────────────────────────────────────────

  async update(id: string, data: Partial<NewClient>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();

    return updated;
  },

  async setEnabled(id: string, enabled: boolean): Promise<Client | undefined> {
    return this.update(id, { enabled });
  },

  // ── TRAFFIC ──────────────────────────────────────────────────────────────────

  /**
   * Добавить запись трафика и обновить счётчики клиента атомарно.
   * Возвращает обновлённого клиента или null, если лимит превышен.
   */
  async addTraffic(
    clientId: string,
    upload: number,
    download: number,
  ): Promise<Client | null> {
    return db.transaction(async (tx) => {
      // Записываем snapshot
      await tx.insert(trafficStats).values({ clientId, upload, download });

      // Обновляем накопленный трафик
      const [updated] = await tx
        .update(clients)
        .set({
          totalUploadUsed:   sql`${clients.totalUploadUsed}   + ${upload}`,
          totalDownloadUsed: sql`${clients.totalDownloadUsed} + ${download}`,
        })
        .where(eq(clients.id, clientId))
        .returning();

      if (!updated || isTrafficExceeded(updated)) return null;

      return updated;
    });
  },

  async resetTraffic(id: string): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set({ totalUploadUsed: 0, totalDownloadUsed: 0 })
      .where(eq(clients.id, id))
      .returning();

    return updated;
  },

  // ── DELETE ───────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning({ id: clients.id });

    return result.length > 0;
  },

  async deleteAllByInbound(inboundId: number): Promise<number> {
    const result = await db
      .delete(clients)
      .where(eq(clients.inboundId, inboundId))
      .returning({ id: clients.id });

    return result.length;
  },

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  isExpired,
  isTrafficExceeded,
  isActive,
} as const;

// ─── Типы для маршрутов ───────────────────────────────────────────────────────

export type { Client, NewClient };
export type ClientCreate = typeof ClientCreateSchema.static;
export type ClientUpdate = typeof ClientUpdateSchema.static;