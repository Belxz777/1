What it is: A management panel (like 3x-ui) for xray-core proxy server with a REST API to manage inbounds and clients.
Stack: Bun + Elysia + SQLite (bun:sqlite) + Drizzle ORM + TypeScript
Structure
proto/            — xray-core protobuf definitions (user, stats, inbound)
src/
├── index.ts                     — entry point, bootstraps Elysia
├── .env / .env.example          — env vars (port, xray paths, db path)
├── config/                      — env validation via Zod, typed config object
├── database/
│   ├── schema.ts                — Drizzle tables: inbounds, clients, traffic_stats, settings, routing_rules
│   ├── index.ts                 — SQLite init (WAL, foreign_keys), drizzle client
│   ├── migrate.ts               — runs drizzle migrations at startup
│   └── plugin.ts                — Elysia plugin that injects `db` into route handlers
├── models/
│   ├── client.ts                — ClientModel (CRUD, traffic tracking, expiry/limit checks)
│   └── inbound.ts               — InboundModel (CRUD, active status)
├── routes/
│   ├── xray.ts                  — REST API: /xray/* (inbounds, clients, status, restart)
│   └── pages.ts                 — serves HTML pages (API tester)
├── services/xray/
│   ├── manage.ts                — xray process: version, status (pgrep), restart (systemctl), validate
│   ├── conf.ts                  — generates xray JSON config from DB
│   ├── conf.template.ts         — minimal fallback template
│   └── inbounds/index.ts        — legacy commented-out code
├── pages/xray_post_tester.html  — in-browser API tester
└── tests/clients.test.ts        — Bun test for ClientModel
Key behaviors
- Auto-restart on mutations: every POST/PATCH/DELETE endpoint regenerates xray config and restarts the process
- Traffic tracking: addTraffic() runs in a transaction — inserts stat row + atomically increments usage counters
- Config generation: reads enabled inbounds + active clients + routing rules from DB, assembles full xray JSON; Trojan uses password, VMess adds alterId: 0
- DB modes: settings/streamSettings use Drizzle mode: "json" (no manual parse/stringify)
Known issues (from bugs.md)
- xray doesn't start by default on Arch Linux — needs manual systemctl restart xray