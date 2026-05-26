import { eq, sql } from "drizzle-orm";
import { t } from "elysia";
import { db } from "../database";
import { inbounds } from "../database/schema";
import type { Inbound, NewInbound } from "../database/schema";

// ─── Elysia validation schemas ───────────────────────────────────────────────

export const InboundCreateSchema = t.Object({
  tag:              t.String({ minLength: 1, maxLength: 255, description: "Уникальный тег подключения" }),
  protocol:         t.String({ minLength: 1, description: "Протокол: vless, vmess, trojan, shadowsocks, socks, http, dokodemo-door" }),
  port:             t.Number({ minimum: 1, maximum: 65535 }),
  listen:           t.Optional(t.String({ default: "0.0.0.0" })),
  settings:         t.Optional(t.String({ default: "{}", description: "JSON-строка настроек протокола" })),
  streamSettings:   t.Optional(t.String({ default: "{}", description: "JSON-строка настроек транспорта" })),
  sniffingEnabled:  t.Optional(t.Boolean({ default: true })),
});

export const InboundUpdateSchema = t.Partial(
  t.Object({
    tag:              t.String({ minLength: 1, maxLength: 255 }),
    protocol:         t.String(),
    port:             t.Number({ minimum: 1, maximum: 65535 }),
    listen:           t.String(),
    enabled:          t.Boolean(),
    settings:         t.String(),
    streamSettings:   t.String(),
    sniffingEnabled:  t.Boolean(),
  })
);

export const InboundParamsSchema = t.Object({
  id: t.Number({ minimum: 1 }),
});

// ─── Бизнес-логика ────────────────────────────────────────────────────────────

/** Активен ли inbound (включён) */
function isActive(inbound: Inbound): boolean {
  return inbound.enabled === true;
}

// ─── Слой данных ──────────────────────────────────────────────────────────────

export const InboundModel = {

  // ── CREATE ──────────────────────────────────────────────────────────────────

  async create(data: NewInbound): Promise<Inbound> {
    const [created] = await db
      .insert(inbounds)
      .values({
        ...data,
        listen:          data.listen          ?? "0.0.0.0",
        enabled:         data.enabled         ?? true,
        settings:        data.settings        ?? "{}",
        streamSettings:  data.streamSettings  ?? "{}",
        sniffingEnabled: data.sniffingEnabled ?? true,
      })
      .returning();

    return created;
  },

  // ── READ ─────────────────────────────────────────────────────────────────────

  async getAll(): Promise<Inbound[]> {
    return db
      .select()
      .from(inbounds)
      .orderBy(sql`${inbounds.id} DESC`);
  },

  async getById(id: number): Promise<Inbound | undefined> {
    return db.query.inbounds.findFirst({
      where: eq(inbounds.id, id),
    });
  },

  async getByTag(tag: string): Promise<Inbound | undefined> {
    return db.query.inbounds.findFirst({
      where: eq(inbounds.tag, tag),
    });
  },

  async getEnabled(): Promise<Inbound[]> {
    return db
      .select()
      .from(inbounds)
      .where(eq(inbounds.enabled, true));
  },

  /** Inbound с клиентами (relational query) */
  async getWithClients(id: number) {
    return db.query.inbounds.findFirst({
      where:  eq(inbounds.id, id),
      with:   { clients: true },
    });
  },

  /** Все inbound с их клиентами */
  async getAllWithClients(): Promise<(Inbound & { clients: any[] })[]> {
    return db.query.inbounds.findMany({
      with: { clients: true },
    });
  },

  // ── UPDATE ───────────────────────────────────────────────────────────────────

  async update(id: number, data: Partial<NewInbound>): Promise<Inbound | undefined> {
    const [updated] = await db
      .update(inbounds)
      .set(data)
      .where(eq(inbounds.id, id))
      .returning();

    return updated;
  },

  async setEnabled(id: number, enabled: boolean): Promise<Inbound | undefined> {
    return this.update(id, { enabled });
  },

  // ── DELETE ───────────────────────────────────────────────────────────────────

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(inbounds)
      .where(eq(inbounds.id, id))
      .returning({ id: inbounds.id });

    return result.length > 0;
  },

  // ── STATS ────────────────────────────────────────────────────────────────────

  /** Количество клиентов в inbound */
  async getClientCount(id: number): Promise<number> {
    const result = await db.query.inbounds.findFirst({
      where: eq(inbounds.id, id),
      with:  { clients: true },
    });

    return result?.clients ?? 0;
  },

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  isActive,
} as const;

// ─── Типы для маршрутов ───────────────────────────────────────────────────────

export type { Inbound, NewInbound };
export type InboundCreate = typeof InboundCreateSchema.static;
export type InboundUpdate = typeof InboundUpdateSchema.static;