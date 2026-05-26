import { env } from "../../config";
import { db } from "../../database";
import { inbounds, clients, routingRules } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import type { Inbound, Client, RoutingRule } from "../../database/schema";

// ─── XRay config types ────────────────────────────────────────────────────────

interface XRayLog {
  loglevel: "debug" | "info" | "warning" | "error" | "none";
  access?: string;
  error?: string;
}

interface XRaySniffing {
  enabled: boolean;
  destOverride: string[];
  routeOnly?: boolean;
}

interface XRayInbound {
  tag:            string;
  port:           number;
  listen:         string;
  protocol:       string;
  settings:       Record<string, unknown>;
  streamSettings: Record<string, unknown>;
  sniffing:       XRaySniffing;
}

interface XRayOutbound {
  protocol: string;
  tag:      string;
  settings?: Record<string, unknown>;
}

interface XRayRoutingRule {
  type:         string;
  outboundTag:  string;
  domain?:      string[];
  ip?:          string[];
  port?:        string;
  protocol?:    string[];
}

interface XRayConfig {
  log:       XRayLog;
  inbounds:  XRayInbound[];
  outbounds: XRayOutbound[];
  routing: {
    domainStrategy: string;
    rules:          XRayRoutingRule[];
  };
}

// ─── Протоколы, поддерживающие список клиентов ────────────────────────────────

const CLIENT_PROTOCOLS = new Set(["vless", "vmess", "trojan"]);

// ─── Маппинг клиента БД → объект клиента XRay ────────────────────────────────

function toXRayClient(client: Client, protocol: string): Record<string, unknown> {
  const base = { id: client.id, email: client.email };

  if (protocol === "trojan") {
    // Trojan использует поле password вместо id
    return { password: client.id, email: client.email };
  }

  if (protocol === "vmess") {
    return { ...base, alterId: 0 };
  }

  return base; // vless
}

// ─── Маппинг правила маршрутизации БД → объект правила XRay ─────────────────

function toXRayRule(rule: RoutingRule): XRayRoutingRule {
  const base: XRayRoutingRule = {
    type:        "field",
    outboundTag: rule.outboundTag ?? (rule.action === "block" ? "block" : "direct"),
  };

  switch (rule.type) {
    case "domain":   return { ...base, domain:   [rule.value] };
    case "ip":       return { ...base, ip:        [rule.value] };
    case "port":     return { ...base, port:      rule.value };
    case "protocol": return { ...base, protocol:  [rule.value] };
    default:         return base;
  }
}

// ─── Основная функция генерации конфига ──────────────────────────────────────

export async function generateXrayConfig(): Promise<XRayConfig> {
  // Загружаем все данные параллельно
  const [enabledInbounds, enabledRules] = await Promise.all([
    db.select()
      .from(inbounds)
      .where(eq(inbounds.enabled, true)),

    db.select()
      .from(routingRules)
      .where(eq(routingRules.enabled, true))
      .orderBy(routingRules.priority),
  ]);

  // Для каждого inbound грузим активных клиентов (параллельно)
  const clientsPerInbound = await Promise.all(
    enabledInbounds.map(inbound =>
      CLIENT_PROTOCOLS.has(inbound.protocol)
        ? db.select()
            .from(clients)
            .where(and(
              eq(clients.inboundId, inbound.id),
              eq(clients.enabled, true),
            ))
        : Promise.resolve([] as Client[])
    )
  );

  // Собираем inbound-секции
  const xrayInbounds: XRayInbound[] = enabledInbounds.map((inbound, i) => {
    const activeClients = clientsPerInbound[i]!;

    // settings уже объект благодаря mode:"json" в схеме Drizzle
    const settings = { ...(inbound.settings as Record<string, unknown>) };

    if (CLIENT_PROTOCOLS.has(inbound.protocol) && activeClients.length > 0) {
      settings.clients = activeClients.map(c => toXRayClient(c, inbound.protocol));
    }

    return {
      tag:            inbound.tag,
      port:           inbound.port,
      listen:         inbound.listen,
      protocol:       inbound.protocol,
      settings,
      streamSettings: inbound.streamSettings as Record<string, unknown>,
      sniffing: {
        enabled:      inbound.sniffingEnabled,
        destOverride: ["http", "tls"],
        routeOnly:    false,
      },
    };
  });

  // Правила маршрутизации из БД
  const xrayRules = enabledRules.map(toXRayRule);

  return {
    log: {
      loglevel: (env.logging.level ?? "warning") as XRayLog["loglevel"],
    },
    inbounds: xrayInbounds,
    outbounds: [
      { protocol: "freedom",   tag: "direct" },
      { protocol: "blackhole", tag: "block"  },
    ],
    routing: {
      domainStrategy: "AsIs",
      rules:          xrayRules,
    },
  };
}

// ─── Запись конфига на диск ───────────────────────────────────────────────────

export async function writeXrayConfig(
  configPath: string = env.xray?.configPath ?? "/etc/xray/config.json"
): Promise<XRayConfig> {
  const config = await generateXrayConfig();
  await Bun.write(configPath, JSON.stringify(config, null, 2));
  return config;
}