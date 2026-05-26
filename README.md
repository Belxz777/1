# bx-panel-xray

> Контекстный файл дОписывает архитектуру, принятые решения и текущее состояние проекта.

---

## Что это

bx-panel — панель управления для xray-core (прокси-сервер). Позволяет управлять inbound-подключениями и клиентами через REST API. Аналог 3x-ui, но написанный с нуля на современном стеке.

---

## Стек

| Слой | Технология |
|---|---|
| Runtime | Bun |
| HTTP-фреймворк | Elysia |
| БД | SQLite (через bun:sqlite) |
| ORM | Drizzle ORM |
| Язык | TypeScript |
| Тесты | Bun test (встроенный) |

---

## Структура проекта

```
src/
├── config/
│   ├── env.ts          # переменные окружения
│   ├── index.ts        # экспорт конфига
│   └── validate.ts     # валидация env
├── database/
│   ├── schema.ts       # Drizzle-схема (источник правды для типов)
│   ├── index.ts        # инициализация db + Drizzle
│   ├── migrate.ts      # запуск миграций
│   └── plugin.ts       # Elysia-плагин (.decorate("db", db))
├── models/
│   ├── client.ts       # ClientModel + Elysia validation schemas
│   └── inbound.ts      # InboundModel + Elysia validation schemas
├── routes/
│   ├── xray.ts         # REST-эндпоинты /xray/*
│   └── pages.ts        # HTML-страницы
├── services/
│   ├── processes/      # (заготовка) менеджер процессов
│   └── xray/
│       ├── manage.ts   # запуск/остановка/статус xray процесса
│       ├── conf.ts     # генерация xray JSON-конфига из БД
│       ├── conf.template.ts
│       └── inbounds/
│           └── index.ts
├── pages/
│   └── xray_post_tester.html
├── index.ts            # точка входа, Elysia app
drizzle/                # сгенерированные миграции (drizzle-kit generate)
drizzle.config.ts       # конфиг drizzle-kit
tests/
└── clients.test.ts
```

---

## База данных

### Схема (src/database/schema.ts)

Все таблицы определены через Drizzle ORM. Типы выводятся автоматически.

**inbounds** — inbound-подключения xray
```
id, tag (unique), protocol, port, listen, enabled (boolean),
settings (json), streamSettings (json), sniffingEnabled (boolean),
createdAt, updatedAt
```

**clients** — клиенты/пользователи inbound
```
id (uuid, PK), inboundId (FK → inbounds.id CASCADE),
email, enabled (boolean),
totalUploadLimit, totalDownloadLimit (байты, 0 = безлимит),
totalUploadUsed, totalDownloadUsed,
expiryTime (unix timestamp, 0 = бессрочно),
createdAt
```

**traffic_stats** — история трафика
```
id, clientId (FK → clients.id CASCADE),
upload, download, recordedAt
```

**settings** — настройки панели (key-value)

**routing_rules** — правила маршрутизации xray
```
id, type (domain/ip/protocol/port), action (direct/proxy/block),
value, outboundTag, priority, enabled
```

### Важные детали схемы
- `enabled` везде хранится как `INTEGER` в SQLite, но Drizzle маппит его как `boolean` через `mode: "boolean"`
- `settings` и `streamSettings` — `TEXT` в SQLite, но Drizzle маппит как `Record<string, unknown>` через `mode: "json"`. **Не нужен ручной JSON.parse/stringify**
- Индексы: `idx_clients_inbound`, `idx_traffic_client`, `idx_traffic_date`

### Миграции
```bash
bun drizzle-kit generate   # создать SQL-миграции из schema.ts
bun drizzle-kit migrate    # применить миграции
bun drizzle-kit push       # для разработки — без файлов миграций
bun drizzle-kit studio     # GUI для БД
```

---

## Models

Паттерн: статический объект `const XxxModel = { ... } as const` с async-методами.

### ClientModel (src/models/client.ts)

```typescript
ClientModel.create(data: NewClient): Promise<Client>
ClientModel.getById(id: string): Promise<Client | undefined>
ClientModel.getByEmail(email: string): Promise<Client | undefined>
ClientModel.getAllByInbound(inboundId: number): Promise<Client[]>
ClientModel.getWithInbound(id: string)           // relational query с inbound
ClientModel.update(id, data): Promise<Client | undefined>
ClientModel.setEnabled(id, enabled): Promise<Client | undefined>
ClientModel.addTraffic(clientId, upload, download): Promise<Client | null>  // транзакция
ClientModel.resetTraffic(id): Promise<Client | undefined>
ClientModel.delete(id): Promise<boolean>
ClientModel.deleteAllByInbound(inboundId): Promise<number>
// pure functions:
ClientModel.isExpired(client): boolean
ClientModel.isTrafficExceeded(client): boolean
ClientModel.isActive(client): boolean
```

Экспортирует схемы валидации для Elysia:
- `ClientCreateSchema` — t.Object для POST
- `ClientUpdateSchema` — t.Partial(...) для PATCH

### InboundModel (src/models/inbound.ts)

```typescript
InboundModel.create(data: NewInbound): Promise<Inbound>
InboundModel.getAll(): Promise<Inbound[]>
InboundModel.getById(id: number): Promise<Inbound | undefined>
InboundModel.getByTag(tag: string): Promise<Inbound | undefined>
InboundModel.getEnabled(): Promise<Inbound[]>
InboundModel.getWithClients(id: number)          // relational query
InboundModel.getAllWithClients()
InboundModel.update(id, data): Promise<Inbound | undefined>
InboundModel.setEnabled(id, enabled): Promise<Inbound | undefined>
InboundModel.delete(id: number): Promise<boolean>
InboundModel.getClientCount(id: number): Promise<number>
```

Экспортирует:
- `InboundCreateSchema`
- `InboundUpdateSchema`

---

## API Routes (/xray/*)

Все маршруты в `src/routes/xray.ts`. Используют `.use(dbPlugin)`.

### Core
```
GET  /xray/status          — версия xray
GET  /xray/running         — запущен ли процесс
POST /xray/restart         — перезаписать конфиг из БД + перезапустить xray
GET  /xray/validate?path=  — валидация конфига (.json)
```

### Inbounds
```
GET    /xray/inbounds
GET    /xray/inbounds/:id
POST   /xray/inbounds
PATCH  /xray/inbounds/:id
DELETE /xray/inbounds/:id   — каскадно удаляет клиентов
```

### Clients
```
GET    /xray/inbounds/:id/clients
POST   /xray/inbounds/:id/clients   — UUID генерируется на сервере
PATCH  /xray/clients/:id
PATCH  /xray/clients/:id/toggle     — { enabled: boolean }
DELETE /xray/clients/:id            — каскадно удаляет traffic_stats
```

**Важно для роутера (memoirist/Elysia):**  
На одном сегменте пути параметр должен иметь одинаковое имя.  
`/inbounds/:id` и `/inbounds/:id/clients` — ок.  
`/inbounds/:id` и `/inbounds/:inboundId/clients` — **конфликт**, падает при старте.

### Паттерн мутирующих эндпоинтов
Каждый POST/PATCH/DELETE вызывает `applyConfig()`:
```typescript
async function applyConfig() {
  await writeXrayConfig();   // генерирует JSON из БД, пишет на диск
  await restartXray();       // перезапускает xray процесс
}
```

---

## XRay Config Generation (src/services/xray/conf.ts)

`generateXrayConfig()` — async, читает из БД параллельно:
```typescript
const [enabledInbounds, enabledRules] = await Promise.all([...]);
const clientsPerInbound = await Promise.all(inbounds.map(...));
```

- Протоколы с клиентами: `vless`, `vmess`, `trojan`
- `trojan` использует поле `password` вместо `id`
- `vmess` требует `alterId: 0`
- `settings`/`streamSettings` уже объекты (Drizzle json mode), не нужен JSON.parse
- Правила маршрутизации загружаются из таблицы `routing_rules`, сортируются по `priority`

`writeXrayConfig(path?)` — вызывает generate + `Bun.write()`

---

## Elysia специфика

### dbPlugin
```typescript
// src/database/plugin.ts
export const dbPlugin = new Elysia({ name: "db" })
  .decorate("db", db)
  .as("plugin");
```
Подключается через `.use(dbPlugin)`, даёт `ctx.db` в хендлерах.

### Валидация
Схемы определяются в моделях и импортируются в роуты:
```typescript
.post("/inbounds", handler, { body: InboundCreateSchema })
.patch("/inbounds/:id", handler, {
  params: t.Object({ id: t.Numeric() }),  // t.Numeric() = строка → число
  body: InboundUpdateSchema,
})
```

### Ошибки
```typescript
// правильно — возвращает HTTP 404
return error(404, { message: "Не найден" });

// неправильно — возвращает HTTP 200 с полем error
return { error: "Не найден" };
```

---

## Тесты

Runner: встроенный `bun test`.

```bash
bun test                          # все тесты
bun test tests/clients.test.ts    # один файл
bun test --watch                  # watch
NODE_ENV=test bun test            # с in-memory БД
```

### In-memory БД для тестов

В `src/database/index.ts`:
```typescript
const DB_PATH = process.env.NODE_ENV === "test"
  ? ":memory:"
  : env.db.path ?? "./data/xpanel.db";

if (process.env.NODE_ENV === "test") {
  const schemaSql = readFileSync(join(import.meta.dir, "schema.sql"), "utf-8");
  sqlite.exec(schemaSql);
}
```

**Проблема:** in-memory БД пустая — таблицы нужно создать через `sqlite.exec(schemaSql)` в `beforeAll` или в самом `database/index.ts`.  
**Нельзя** использовать `migrate()` с in-memory БД без папки `drizzle/` — упадёт с `Can't find meta/_journal.json`.

### Зависимость FK в тестах
Клиент ссылается на `inbound_id`. Перед тестами клиентов нужно создать тестовый inbound:
```typescript
beforeAll(() => {
  sqlite.exec(`INSERT INTO inbounds (tag, protocol, port) VALUES ('test', 'vless', 443)`);
});
```

---

## Нерешённые задачи / TODO

- `services/processes/` — пустая папка, заготовка под ProcessManager
- `manage.ts` — нужен watch на xray процесс (авторестарт при падении)
- Polling трафика — `traffic_stats` не заполняется, нужен cron/setInterval который дёргает xray stats API (`POST /stats/query`) и вызывает `ClientModel.addTraffic()`
- Swagger — не подключён (`@elysiajs/swagger`), нужен для удобного ручного тестирования
- `InboundModel.getClientCount` возвращает `result?.clients ?? 0` — баг, `clients` это массив, нужно `result?.clients.length ?? 0`
- Тесты для InboundModel не написаны
- `src/models/inbound.ts` — `settings` и `streamSettings` в схемах валидации (`InboundCreateSchema`) описаны как `t.String()` но должны быть `t.Object()` или `t.Record()` после перехода на Drizzle json mode

---

## Известные баги и решения

| Баг | Причина | Решение |
|---|---|---|
