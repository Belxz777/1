import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
export const PROTOCOLS = [
  "vless",
  "vmess",
  "trojan",
  "shadowsocks",
  "socks",
  "http",
  "dokodemo-door",
] as const;
export const inbounds = sqliteTable("inbounds", {
  id:              integer("id").primaryKey({ autoIncrement: true }),
  tag:             text("tag").notNull().unique(),
  protocol:        text("protocol", {
                     enum: PROTOCOLS
                   }).notNull(),
  port:            integer("port").notNull(),
  listen:          text("listen").notNull().default("0.0.0.0"),
  enabled:         integer("enabled", { mode: "boolean" }).notNull().default(true),
  settings:        text("settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  streamSettings:  text("stream_settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  sniffingEnabled: integer("sniffing_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt:       text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt:       text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const clients = sqliteTable("clients", {
  id:                   text("id").primaryKey(),       // UUID
  inboundId:            integer("inbound_id").notNull().references(() => inbounds.id, { onDelete: "cascade" }),
  email:                text("email").notNull(),
  enabled:              integer("enabled", { mode: "boolean" }).notNull().default(true),
  totalUploadLimit:     integer("total_upload_limit").default(0),
  totalDownloadLimit:   integer("total_download_limit").default(0),
  totalUploadUsed:      integer("total_upload_used").default(0),
  totalDownloadUsed:    integer("total_download_used").default(0),
  expiryTime:           integer("expiry_time").default(0),
  createdAt:            text("created_at").notNull().default(sql`(datetime('now'))`),
}, t => ({
  inboundIdx: index("idx_clients_inbound").on(t.inboundId),
}));

export const trafficStats = sqliteTable("traffic_stats", {
  id:         integer("id").primaryKey({ autoIncrement: true }),
  clientId:   text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  upload:     integer("upload").notNull().default(0),
  download:   integer("download").notNull().default(0),
  recordedAt: text("recorded_at").notNull().default(sql`(datetime('now'))`),
}, t => ({
  clientIdx: index("idx_traffic_client").on(t.clientId),
  dateIdx:   index("idx_traffic_date").on(t.recordedAt),
}));

export const settings = sqliteTable("settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const routingRules = sqliteTable("routing_rules", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  type:        text("type", { enum: ["domain","ip","protocol","port"] }).notNull(),
  action:      text("action", { enum: ["direct","proxy","block"] }).notNull(),
  value:       text("value").notNull(),
  outboundTag: text("outbound_tag"),
  priority:    integer("priority").notNull().default(0),
  enabled:     integer("enabled", { mode: "boolean" }).notNull().default(true),
});

// ─── Relations для Drizzle relational queries ─────────────────────────────────

export const inboundsRelations = relations(inbounds, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  inbound: one(inbounds, {
    fields:   [clients.inboundId],
    references: [inbounds.id],
  }),
  trafficStats: many(trafficStats),
}));

export const trafficStatsRelations = relations(trafficStats, ({ one }) => ({
  client: one(clients, {
    fields:   [trafficStats.clientId],
    references: [clients.id],
  }),
}));

// ─── Экспорт выведенных типов ─────────────────────────────────────────────────

export type Inbound      = typeof inbounds.$inferSelect;
export type NewInbound   = typeof inbounds.$inferInsert;
export type Client       = typeof clients.$inferSelect;
export type NewClient    = typeof clients.$inferInsert;
export type TrafficStat  = typeof trafficStats.$inferSelect;
export type Setting      = typeof settings.$inferSelect;
export type RoutingRule  = typeof routingRules.$inferSelect;