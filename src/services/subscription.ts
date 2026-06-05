import { env } from "../config";
import type { Client, Inbound } from "../database/schema";

function getHost(): string {
  return env.publicHost;
}

function getRemark(inbound: Inbound, client: Client): string {
  return `${inbound.tag} | ${client.email}`;
}

function extractStreamParams(stream: Record<string, unknown>) {
  const network = (stream.network as string) || "tcp";
  const security = (stream.security as string) || "none";

  const tls = stream.tlsSettings as Record<string, unknown> | undefined;
  const reality = stream.realitySettings as Record<string, unknown> | undefined;
  const ws = stream.wsSettings as Record<string, unknown> | undefined;
  const tcp = stream.tcpSettings as Record<string, unknown> | undefined;
  const grpc = stream.grpcSettings as Record<string, unknown> | undefined;
  const kcp = stream.kcpSettings as Record<string, unknown> | undefined;

  const headerType = tcp?.header
    ? (tcp.header as Record<string, unknown>).type as string
    : kcp?.header
      ? (kcp.header as Record<string, unknown>).type as string
      : "none";

  const path = ws?.path as string || grpc?.serviceName as string || "";
  const host = ws?.headers
    ? (ws.headers as Record<string, string>).Host
    : "";

  const sni = tls?.serverName as string || reality?.serverName as string || host || "";
  const fp = (tls?.fingerprint as string) || (reality?.fingerprint as string) || "";
  const pbk = reality?.publicKey as string || "";
  const sid = reality?.shortId as string || "";
  const flow = reality?.flow as string || (tls?.flow as string) || "";
  const serviceName = grpc?.serviceName as string || "";
  const alpn = tls?.alpn ? (tls.alpn as string[]).join(",") : "";

  return {
    network, security, headerType, path, host,
    sni, fp, pbk, sid, flow, serviceName, alpn,
  };
}

function buildVlessLink(inbound: Inbound, client: Client): string {
  const s = extractStreamParams(inbound.streamSettings as Record<string, unknown>);
  const host = getHost();
  const remark = encodeURIComponent(getRemark(inbound, client));

  const params = new URLSearchParams();
  params.set("encryption", "none");
  params.set("type", s.network);
  params.set("security", s.security);
  if (s.flow) params.set("flow", s.flow);
  if (s.sni) params.set("sni", s.sni);
  if (s.fp) params.set("fp", s.fp);
  if (s.pbk) params.set("pbk", s.pbk);
  if (s.sid) params.set("sid", s.sid);
  if (s.headerType && s.headerType !== "none") params.set("headerType", s.headerType);
  if (s.serviceName) params.set("serviceName", s.serviceName);
  if (s.path) params.set("path", s.path);
  if (s.host) params.set("host", s.host);
  if (s.alpn) params.set("alpn", s.alpn);

  return `vless://${client.id}@${host}:${inbound.port}?${params.toString()}#${remark}`;
}

function buildVmessLink(inbound: Inbound, client: Client): string {
  const s = extractStreamParams(inbound.streamSettings as Record<string, unknown>);
  const host = getHost();
  const remark = getRemark(inbound, client);

  const obj: Record<string, string | number> = {
    v: "2",
    ps: remark,
    add: host,
    port: inbound.port,
    id: client.id,
    aid: "0",
    scy: "auto",
    net: s.network,
    type: s.headerType || "none",
    tls: s.security,
  };

  if (s.sni) obj.sni = s.sni;
  if (s.fp) obj.fp = s.fp;
  if (s.pbk) obj.pbk = s.pbk;
  if (s.sid) obj.sid = s.sid;
  if (s.host) obj.host = s.host;
  if (s.path) obj.path = s.path;
  if (s.serviceName) obj.servicename = s.serviceName;
  if (s.flow) obj.flow = s.flow;
  if (s.alpn) obj.alpn = s.alpn;

  const json = JSON.stringify(obj);
  return "vmess://" + Buffer.from(json).toString("base64url");
}

function buildTrojanLink(inbound: Inbound, client: Client): string {
  const s = extractStreamParams(inbound.streamSettings as Record<string, unknown>);
  const host = getHost();
  const remark = encodeURIComponent(getRemark(inbound, client));

  const params = new URLSearchParams();
  params.set("security", s.security);
  params.set("type", s.network);
  if (s.sni) params.set("sni", s.sni);
  if (s.fp) params.set("fp", s.fp);
  if (s.pbk) params.set("pbk", s.pbk);
  if (s.sid) params.set("sid", s.sid);
  if (s.headerType && s.headerType !== "none") params.set("headerType", s.headerType);
  if (s.serviceName) params.set("serviceName", s.serviceName);
  if (s.path) params.set("path", s.path);
  if (s.host) params.set("host", s.host);
  if (s.alpn) params.set("alpn", s.alpn);
  if (s.flow) params.set("flow", s.flow);

  return `trojan://${client.id}@${host}:${inbound.port}?${params.toString()}#${remark}`;
}

function buildShadowsocksLink(inbound: Inbound, client: Client): string {
  const host = getHost();
  const remark = encodeURIComponent(getRemark(inbound, client));
  const settings = inbound.settings as Record<string, unknown>;
  const method = (settings.method as string) || "aes-256-gcm";
  const password = client.id;

  const userInfo = Buffer.from(`${method}:${password}`).toString("base64url");
  return `ss://${userInfo}@${host}:${inbound.port}#${remark}`;
}

export function buildShareLink(inbound: Inbound, client: Client): string | null {
  switch (inbound.protocol) {
    case "vless": return buildVlessLink(inbound, client);
    case "vmess": return buildVmessLink(inbound, client);
    case "trojan": return buildTrojanLink(inbound, client);
    case "shadowsocks": return buildShadowsocksLink(inbound, client);
    default: return null;
  }
}

export function buildSubscription(lines: string[]): string {
  return Buffer.from(lines.join("\n")).toString("base64");
}
