import Elysia, { t } from "elysia";
import { dbPlugin } from "../database/plugin";
import {
  getXrayVersion,
  isXrayRunning,
  restartXray,
  validateConfig,
} from "../services/xray/manage";
import { writeXrayConfig } from "../services/xray/conf";
import {
  getStat,
  queryStats,
  getSysStats,
  getAllOnlineUsers,
  getUserStats,
} from "../services/xray/api";
import { InboundModel, InboundCreateSchema, InboundUpdateSchema, NewInbound } from "../models/inbound";
import { ClientModel, ClientCreateSchema } from "../models/client";
import { addUserToInbound, removeUserFromInbound, listInbounds } from "../services/xray/handler";

// ─── Хелпер: перезаписать конфиг и перезапустить xray ────────────────────────

async function applyConfig() {
  await writeXrayConfig();
  await restartXray();
}

// ─── Маршруты ─────────────────────────────────────────────────────────────────

export const xrayRoutes = new Elysia({ prefix: "/xray" })
  .use(dbPlugin)

  // ==================== CORE ====================

  .get("/status", () => getXrayVersion())

  .get("/running", () => isXrayRunning())

  .post("/restart", async () => {
    await applyConfig();
    return { success: true };
  })

  .get(
    "/validate",
    ({ query }) => validateConfig(query.path),
    {
      query: t.Object({
        path: t.Optional(
          t.String({ pattern: "\\.json$", error: "Config path must end with .json" })
        ),
      }),
    }
  )

  // ==================== INBOUNDS ====================

  .get("/inbounds", () => InboundModel.getAll())

  .get(
    "/inbounds/:id",
    async ({ params, status }) => {
      const inbound = await InboundModel.getById(Number(params.id));
      if(inbound)  {
        status(404)
        return { message: "Inbound не найден" }
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )

  .post(
    "/inbounds",
    async ({ body }) => {
      const inbound = await InboundModel.create(body as NewInbound);
      await applyConfig();
      return inbound;
    },
    { body: InboundCreateSchema }
  )

.patch(
  "/inbounds/:id",
  async ({ params, body, status }) => {
    const inbound = await InboundModel.update(
      params.id,
      body as Partial<NewInbound> //partial часть типо не весь
    );

    if (!inbound) {
      status(404);
      return { message: "Inbound не найден" };
    }

    await applyConfig();
    return inbound;
  },
  {
    params: t.Object({
      id: t.Numeric(),
    }),
    body: InboundUpdateSchema,
  }
)
  .delete(
    "/inbounds/:id",
    async ({ params, status }) => {
      const deleted = await InboundModel.delete(Number(params.id));
      if (!deleted){
        status(404)
        return {
          message:"Не найден"
        }
      } 
      await applyConfig();
      return { success: true };
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )

  // ==================== CLIENTS ====================

  .get(
    "/inbounds/:id/clients",
    ({ params }) => ClientModel.getAllByInbound(Number(params.id)),
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )

  .post(
    "/inbounds/:id/clients",
    async ({ params, body }) => {
      const client = await ClientModel.create({
        ...body,
        id:        crypto.randomUUID(),
        inboundId: Number(params.id),
      });
      await applyConfig();
      return client;
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Omit(ClientCreateSchema, ["id", "inbound_id"]),
    }
  )

  .patch(
    "/clients/:id",
    async ({ params, body, status }) => {
      const client = await ClientModel.update(params.id, body);
      if (!client) {
        status(404)
        return { message: "Клиент не найден" }
      }
      await applyConfig();
      return client;
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Partial(
        t.Omit(ClientCreateSchema, ["id", "inbound_id"])
      ),
    }
  )

  .patch(
    "/clients/:id/toggle",
    async ({ params, body, status }) => {
      const client = await ClientModel.setEnabled(params.id, body.enabled);
      if (!client){
        status(404)
        return  { message: "Клиент не найден" };
      } 
      await applyConfig();
      return client;
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body:   t.Object({ enabled: t.Boolean() }),
    }
  )

  .delete(
    "/clients/:id",
    async ({ params, status }) => {
      const deleted = await ClientModel.delete(params.id);
      if (!deleted){
        status(404)
        return { message:"Клиент не найден"}
      } 
      await applyConfig();
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    }
  )

  // ==================== XRAY API (gRPC) ====================

  .get(
    "/api/stats",
    async ({ query }) => getStat(query.name, query.reset === "true"),
    {
      query: t.Object({
        name: t.String({ error: "Stat name is required" }),
        reset: t.Optional(t.String()),
      }),
    }
  )

  .get(
    "/api/stats/query",
    async ({ query }) => queryStats(query.pattern, query.reset === "true"),
    {
      query: t.Object({
        pattern: t.String({ error: "Pattern is required" }),
        reset: t.Optional(t.String()),
      }),
    }
  )

  .get("/api/sysstats", () => getSysStats())

  .get("/api/online", () => getAllOnlineUsers())

  .get(
    "/api/users",
    async ({ query }) => getUserStats(query.traffic !== "false", query.reset === "true"),
    {
      query: t.Object({
        traffic: t.Optional(t.String()),
        reset: t.Optional(t.String()),
      }),
    }
  )

  // ==================== HANDLER SERVICE (gRPC AlterInbound) ====================

  .post(
    "/handlers/:tag/users",
    async ({ params, body }) => {
      return addUserToInbound(
        params.tag,
        body.email,
        body.level ?? 0,
        body.protocol,
        body.id,
      );
    },
    {
      params: t.Object({ tag: t.String() }),
      body: t.Object({
        email: t.String(),
        protocol: t.String(),
        id: t.String(),
        level: t.Optional(t.Number()),
      }),
    }
  )

  .delete(
    "/handlers/:tag/users/:email",
    async ({ params }) => {
      return removeUserFromInbound(params.tag, params.email);
    },
    {
      params: t.Object({
        tag: t.String(),
        email: t.String(),
      }),
    }
  )

  .get("/handler/list", () => listInbounds());