import Elysia, { t } from "elysia";
import { dbPlugin } from "../database/plugin";
import {
  getXrayVersion,
  isXrayRunning,
  restartXray,
  validateConfig,
} from "../services/xray/manage";
import { writeXrayConfig } from "../services/xray/conf";
import { InboundModel, InboundCreateSchema, InboundUpdateSchema } from "../models/inbound";
import { ClientModel, ClientCreateSchema } from "../models/client";

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
    async ({ params, error }) => {
      const inbound = await InboundModel.getById(Number(params.id));
      return inbound ?? error(404, { message: "Inbound не найден" });
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  )

  .post(
    "/inbounds",
    async ({ body }) => {
      const inbound = await InboundModel.create(body);
      await applyConfig();
      return inbound;
    },
    { body: InboundCreateSchema }
  )

  .patch(
    "/inbounds/:id",
    async ({ params, body, error }) => {
      const inbound = await InboundModel.update(Number(params.id), body);
      if (!inbound) return error(404, { message: "Inbound не найден" });
      await applyConfig();
      return inbound;
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body:   InboundUpdateSchema,
    }
  )

  .delete(
    "/inbounds/:id",
    async ({ params, error }) => {
      const deleted = await InboundModel.delete(Number(params.id));
      if (!deleted) return error(404, { message: "Inbound не найден" });
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
    async ({ params, body, error }) => {
      const client = await ClientModel.update(params.id, body);
      if (!client) return error(404, { message: "Клиент не найден" });
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
    async ({ params, body, error }) => {
      const client = await ClientModel.setEnabled(params.id, body.enabled);
      if (!client) return error(404, { message: "Клиент не найден" });
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
    async ({ params, error }) => {
      const deleted = await ClientModel.delete(params.id);
      if (!deleted) return error(404, { message: "Клиент не найден" });
      await applyConfig();
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    }
  );