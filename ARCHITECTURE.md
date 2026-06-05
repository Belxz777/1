# bx-panel-xray — Архитектура и API

> Панель управления для xray-core. REST API + Web + Subscription.

---

## Стек

| Слой | Технология |
|------|-----------|
| Runtime | Bun 1.x |
| HTTP | Elysia |
| БД | SQLite (bun:sqlite) |
| ORM | Drizzle ORM |
| gRPC | @grpc/grpc-js + xray API |
| Валидация | Zod (env) / Elysia t. (routes) |
| Тесты | Bun test |

---

## Структура проекта

```
src/
├── index.ts                   # Точка входа, await runMigrations()
├── config/
│   ├── env.ts                 # Типизированный конфиг из process.env
│   ├── validate.ts            # Zod-схема валидации env
│   └── index.ts               # barrel export
├── database/
│   ├── schema.ts              # Drizzle-таблицы + relations
│   ├── index.ts               # Инициализация SQLite + Drizzle
│   ├── migrate.ts             # Запуск миграций
│   └── plugin.ts              # Elysia-плагин с .decorate("db")
├── models/
│   ├── client.ts              # ClientModel (CRUD, трафик, срок)
│   └── inbound.ts             # InboundModel (CRUD)
├── routes/
│   ├── xray.ts                # REST /xray/* (inbounds, clients, core)
│   ├── subscription.ts        # /sub/* и /share/*
│   └── pages.ts               # /pages/* (HTML)
├── services/
│   ├── xray/
│   │   ├── manage.ts          # Запуск/остановка/статус xray
│   │   ├── conf.ts            # Генерация xray config из БД
│   │   ├── conf.template.ts   # Шаблон конфига
│   │   ├── api.ts             # gRPC-клиент к xray API
│   │   └── inbounds/          # (legacy, закомментировано)
│   └── subscription.ts        # Генерация share-ссылок и подписок
├── tests/
│   ├── clients.test.ts        # Тесты ClientModel
│   └── subscription.test.ts   # Тесты subscription (12 тестов)
├── pages/
│   └── xray_post_tester.html  # HTML-тестер API
├── drizzle/                   # Миграции (сгенерированы)
│   ├── 0000_swift_gabe_jones.sql
│   └── meta/_journal.json
└── drizzle.config.ts          # Конфиг drizzle-kit
```

---

## API Endpoints

### Core (`/xray/*`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/xray/status` | Версия xray |
| GET | `/xray/running` | Статус процесса |
| POST | `/xray/restart` | Перезаписать конфиг + рестарт |
| GET | `/xray/validate?path=` | Валидация конфига |

### Inbounds (`/xray/inbounds`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/xray/inbounds` | Все inbound |
| GET | `/xray/inbounds/:id` | По ID |
| POST | `/xray/inbounds` | Создать |
| PATCH | `/xray/inbounds/:id` | Обновить |
| DELETE | `/xray/inbounds/:id` | Удалить (каскадно) |

### Clients (`/xray/inbounds/:id/clients`, `/xray/clients/:id`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/xray/inbounds/:id/clients` | Клиенты inbound |
| POST | `/xray/inbounds/:id/clients` | Создать (UUID генерируется) |
| PATCH | `/xray/clients/:id` | Обновить |
| PATCH | `/xray/clients/:id/toggle` | Вкл/выкл |
| DELETE | `/xray/clients/:id` | Удалить (каскадно) |

### XRay API (gRPC → REST, `/xray/api/*`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/xray/api/stats?name=&reset=` | Счётчик трафика |
| GET | `/xray/api/stats/query?pattern=` | Поиск счётчиков |
| GET | `/xray/api/sysstats` | Системная статистика |
| GET | `/xray/api/online` | Online пользователи |
| GET | `/xray/api/users?traffic=&reset=` | Все пользователи с IP |

### Subscription (`/sub/*`, `/share/*`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/sub/:uuid` | Подписка (base64) |
| GET | `/sub/:uuid/info` | Инфо о клиенте |
| GET | `/share/:uuid` | Share-ссылка (JSON) |

---

## Subscription и share-ссылки

Поддерживаемые протоколы:

| Протокол | Формат ссылки |
|----------|---------------|
| VLESS | `vless://uuid@host:port?...params...#remark` |
| VMESS | `vmess://base64(JSON)` |
| Trojan | `trojan://password@host:port?...params...#remark` |
| Shadowsocks | `ss://base64(method:password)@host:port#remark` |

Параметры, извлекаемые из `streamSettings`:

| Параметр | Источник |
|----------|----------|
| `type` | `streamSettings.network` (tcp/ws/grpc/kcp/http/quic) |
| `security` | `streamSettings.security` (none/tls/reality) |
| `path` | `wsSettings.path` или `grpcSettings.serviceName` |
| `host` | `wsSettings.headers.Host` |
| `sni` | `tlsSettings.serverName` или `realitySettings.serverName` |
| `fp` | `tlsSettings.fingerprint` или `realitySettings.fingerprint` |
| `pbk` | `realitySettings.publicKey` |
| `sid` | `realitySettings.shortId` |
| `flow` | `realitySettings.flow` |
| `serviceName` | `grpcSettings.serviceName` |
| `alpn` | `tlsSettings.alpn` (через запятую) |
| `headerType` | `tcpSettings.header.type` или `kcpSettings.header.type` |

Формат подписки (subscription):
- Тело: base64 от одной или нескольких share-ссылок, разделённых `\n`
- Content-Type: `text/plain; charset=utf-8`
- Заголовки: `Profile-WebPage-Url`, `Profile-Title`

---

## XRay gRPC API

Подключение к API-инбанду xray (по умолчанию `127.0.0.1:10085`).

Прото-файлы в `proto/`:
- `stats.proto` — StatsService (трафик, online, sys)
- `inbound.proto` — HandlerService (CRUD inbounds)
- `user.proto` — User message

Эндпоинты REST — обёртка над gRPC вызовами. При недоступности xray API возвращают `{ success: false, error: "..." }`.

---

## База данных

### Схема

```
inbounds
  id, tag (unique), protocol, port, listen, enabled (boolean),
  settings (json), streamSettings (json), sniffingEnabled

clients
  id (uuid PK), inboundId (FK → inbounds CASCADE), email,
  enabled, totalUploadLimit, totalDownloadLimit,
  totalUploadUsed, totalDownloadUsed, expiryTime

traffic_stats
  id, clientId (FK → clients CASCADE), upload, download, recordedAt

settings        — key-value
routing_rules   — правила маршрутизации
```

### Relations (Drizzle)

```typescript
inbounds → clients          (one → many)
clients  → inbound          (many → one)
clients  → trafficStats     (one → many)
```

---

## Конфигурация (.env)

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `PORT` | — | Порт сервера |
| `NODE_ENV` | `development` | Режим |
| `LOG_LEVEL` | `info` | Уровень логов |
| `DB_PATH` | — | Путь к SQLite |
| `XRAY_BINARY` | — | Путь к xray |
| `XRAY_CONFIG` | — | Путь к конфигу xray |
| `XRAY_LOCATION_ASSET` | — | Папка assets xray |
| `XRAY_API_ADDRESS` | `127.0.0.1:10085` | gRPC API xray |
| `SERVER_PUBLIC_HOST` | `127.0.0.1` | Публичный адрес для ссылок |

---

## Тесты

```bash
# Запуск всех тестов
PORT=3000 DB_PATH=/tmp/test.db NODE_ENV=test LOG_LEVEL=info \
  XRAY_BINARY=xray XRAY_CONFIG=/etc/xray/config.json \
  XRAY_LOCATION_ASSET=/usr/share/xray \
  XRAY_API_ADDRESS=127.0.0.1:10085 \
  SERVER_PUBLIC_HOST=test.example.com \
  bun test

# Только subscription
bun test src/tests/subscription.test.ts

# С watch
bun test --watch
```

---

## Docker

```bash
# Сборка
docker compose build

# Запуск
docker compose up -d

# Логи
docker compose logs -f
```

См. `Dockerfile` и `docker-compose.yml`.
