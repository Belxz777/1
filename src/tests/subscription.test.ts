import { describe, it, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { buildShareLink, buildSubscription } from "../services/subscription";

const sqlite = new Database(":memory:");
sqlite.run("PRAGMA foreign_keys = ON;");

sqlite.run(
  "CREATE TABLE inbounds (" +
  "id integer PRIMARY KEY AUTOINCREMENT NOT NULL, " +
  "tag text NOT NULL, " +
  "protocol text NOT NULL, " +
  "port integer NOT NULL, " +
  "listen text DEFAULT '0.0.0.0' NOT NULL, " +
  "enabled integer DEFAULT true NOT NULL, " +
  "settings text DEFAULT '{}' NOT NULL, " +
  "stream_settings text DEFAULT '{}' NOT NULL, " +
  "sniffing_enabled integer DEFAULT true NOT NULL, " +
  "created_at text DEFAULT (datetime('now')) NOT NULL, " +
  "updated_at text DEFAULT (datetime('now')) NOT NULL" +
  ")"
);
sqlite.run(
  "CREATE TABLE clients (" +
  "id text PRIMARY KEY NOT NULL, " +
  "inbound_id integer NOT NULL REFERENCES inbounds(id) ON DELETE cascade, " +
  "email text NOT NULL, " +
  "enabled integer DEFAULT true NOT NULL, " +
  "total_upload_limit integer DEFAULT 0, " +
  "total_download_limit integer DEFAULT 0, " +
  "total_upload_used integer DEFAULT 0, " +
  "total_download_used integer DEFAULT 0, " +
  "expiry_time integer DEFAULT 0, " +
  "created_at text DEFAULT (datetime('now')) NOT NULL" +
  ")"
);
sqlite.run("CREATE UNIQUE INDEX inbounds_tag_unique ON inbounds (tag)");

function makeInbound(overrides: Partial<schema.NewInbound> = {}): schema.Inbound {
  return {
    id: 1,
    tag: "test-inbound",
    protocol: "vless",
    port: 10443,
    listen: "0.0.0.0",
    enabled: true,
    settings: {},
    streamSettings: {},
    sniffingEnabled: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
    ...overrides,
  } as schema.Inbound;
}

function makeClient(overrides: Partial<schema.Client> = {}): schema.Client {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    inboundId: 1,
    email: "user@test.com",
    enabled: true,
    totalUploadLimit: 0,
    totalDownloadLimit: 0,
    totalUploadUsed: 0,
    totalDownloadUsed: 0,
    expiryTime: 0,
    createdAt: "2026-01-01 00:00:00",
    ...overrides,
  } as schema.Client;
}

describe("buildShareLink", () => {

  it("vless with defaults (tcp, no security)", () => {
    const link = buildShareLink(makeInbound(), makeClient());
    expect(link).toStartWith("vless://550e8400-e29b-41d4-a716-446655440000@test.example.com:10443?");
    expect(link).toContain("encryption=none");
    expect(link).toContain("type=tcp");
    expect(link).toContain("security=none");
    expect(link).toContain("#test-inbound%20%7C%20user%40test.com");
  });

  it("vless with WebSocket + TLS", () => {
    const inbound = makeInbound({
      streamSettings: {
        network: "ws",
        security: "tls",
        wsSettings: { path: "/ws", headers: { Host: "example.com" } },
        tlsSettings: { serverName: "example.com", fingerprint: "chrome" },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toContain("type=ws");
    expect(link).toContain("security=tls");
    expect(link).toContain("path=%2Fws");
    expect(link).toContain("host=example.com");
    expect(link).toContain("sni=example.com");
    expect(link).toContain("fp=chrome");
  });

  it("vless with REALITY", () => {
    const inbound = makeInbound({
      protocol: "vless",
      streamSettings: {
        network: "tcp",
        security: "reality",
        realitySettings: {
          serverName: "google.com",
          fingerprint: "chrome",
          publicKey: "abc123pub",
          shortId: "def456",
          flow: "xtls-rprx-vision",
        },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toContain("security=reality");
    expect(link).toContain("sni=google.com");
    expect(link).toContain("fp=chrome");
    expect(link).toContain("pbk=abc123pub");
    expect(link).toContain("sid=def456");
    expect(link).toContain("flow=xtls-rprx-vision");
  });

  it("vless with gRPC", () => {
    const inbound = makeInbound({
      streamSettings: {
        network: "grpc",
        security: "tls",
        grpcSettings: { serviceName: "myservice" },
        tlsSettings: { serverName: "grpc.example.com" },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toContain("type=grpc");
    expect(link).toContain("serviceName=myservice");
    expect(link).toContain("sni=grpc.example.com");
  });

  it("vless with TCP + HTTP header", () => {
    const inbound = makeInbound({
      streamSettings: {
        network: "tcp",
        security: "none",
        tcpSettings: { header: { type: "http" } },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toContain("type=tcp");
    expect(link).toContain("headerType=http");
  });

  it("vmess generates base64 link", () => {
    const inbound = makeInbound({ protocol: "vmess" });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toStartWith("vmess://");
    const b64 = link.slice(8);
    const decoded = JSON.parse(Buffer.from(b64, "base64url").toString());
    expect(decoded.v).toBe("2");
    expect(decoded.ps).toBe("test-inbound | user@test.com");
    expect(decoded.add).toBe("test.example.com");
    expect(decoded.port).toBe(10443);
    expect(decoded.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(decoded.net).toBe("tcp");
  });

  it("vmess with ws + tls", () => {
    const inbound = makeInbound({
      protocol: "vmess",
      streamSettings: {
        network: "ws",
        security: "tls",
        wsSettings: { path: "/vmess", headers: { Host: "cdn.example.com" } },
        tlsSettings: { serverName: "cdn.example.com" },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toStartWith("vmess://");
    const b64 = link.slice(8);
    const decoded = JSON.parse(Buffer.from(b64, "base64url").toString());
    expect(decoded.net).toBe("ws");
    expect(decoded.tls).toBe("tls");
    expect(decoded.path).toBe("/vmess");
    expect(decoded.host).toBe("cdn.example.com");
    expect(decoded.sni).toBe("cdn.example.com");
  });

  it("trojan generates correct link", () => {
    const inbound = makeInbound({
      protocol: "trojan",
      streamSettings: {
        network: "tcp",
        security: "tls",
        tlsSettings: { serverName: "trojan.example.com" },
      },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toStartWith("trojan://550e8400-e29b-41d4-a716-446655440000@");
    expect(link).toContain("security=tls");
    expect(link).toContain("sni=trojan.example.com");
    expect(link).toContain("type=tcp");
  });

  it("shadowsocks generates correct link", () => {
    const inbound = makeInbound({
      protocol: "shadowsocks",
      settings: { method: "chacha20-ietf-poly1305" },
    });
    const link = buildShareLink(inbound, makeClient());
    expect(link).toStartWith("ss://");
    expect(link).toContain("@test.example.com:10443");
    const userInfo = link.split("@")[0]!.slice(5);
    const decoded = Buffer.from(userInfo, "base64url").toString();
    expect(decoded).toStartWith("chacha20-ietf-poly1305:");
    expect(decoded).toContain("550e8400");
  });

  it("returns null for unsupported protocol", () => {
    const inbound = makeInbound({ protocol: "dokodemo-door" });
    expect(buildShareLink(inbound, makeClient())).toBeNull();
  });

});

describe("buildSubscription", () => {

  it("encodes single link in base64", () => {
    const link = "vless://uuid@host:443?type=tcp#remark";
    const sub = buildSubscription([link]);
    const decoded = Buffer.from(sub, "base64").toString();
    expect(decoded).toBe(link);
  });

  it("encodes multiple links separated by newline", () => {
    const links = [
      "vless://a@host:443?type=tcp#a",
      "vmess://b64",
      "trojan://c@host:443#c",
    ];
    const sub = buildSubscription(links);
    const decoded = Buffer.from(sub, "base64").toString();
    expect(decoded).toBe(links.join("\n"));
  });

});
