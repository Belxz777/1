import Elysia, { t } from "elysia";
import { ClientModel } from "../models/client";
import { InboundModel } from "../models/inbound";
import { buildShareLink, buildSubscription } from "../services/subscription";

export const subRoutes = new Elysia({ prefix: "/sub" })

  .get(
    "/:uuid",
    async ({ params: { uuid }, error }) => {
      const client = await ClientModel.getWithInbound(uuid);
      if (!client || !client.inbound) {
        return error(404, { message: "Клиент не найден" });
      }

      const link = buildShareLink(client.inbound, client);
      if (!link) {
        return error(400, { message: "Протокол не поддерживается для подписок" });
      }

      const sub = buildSubscription([link]);
      return new Response(sub, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Profile-WebPage-Url": "",
          "Profile-Title": `${client.inbound.tag} | ${client.email}`,
        },
      });
    },
    { params: t.Object({ uuid: t.String({ format: "uuid" }) }) }
  )

  .get(
    "/:uuid/info",
    async ({ params: { uuid }, error }) => {
      const client = await ClientModel.getWithInbound(uuid);
      if (!client || !client.inbound) {
        return error(404, { message: "Клиент не найден" });
      }

      const expired = ClientModel.isExpired(client);
      const trafficExceeded = ClientModel.isTrafficExceeded(client);
      const active = ClientModel.isActive(client);

      return {
        email: client.email,
        inboundTag: client.inbound.tag,
        protocol: client.inbound.protocol,
        enabled: client.enabled,
        active,
        expired,
        trafficExceeded,
        uploadUsed: client.totalUploadUsed,
        downloadUsed: client.totalDownloadUsed,
        uploadLimit: client.totalUploadLimit,
        downloadLimit: client.totalDownloadLimit,
        expiryTime: client.expiryTime,
        createdAt: client.createdAt,
      };
    },
    { params: t.Object({ uuid: t.String({ format: "uuid" }) }) }
  );

export const shareRoutes = new Elysia({ prefix: "/share" })

  .get(
    "/:uuid",
    async ({ params: { uuid }, error }) => {
      const client = await ClientModel.getWithInbound(uuid);
      if (!client || !client.inbound) {
        return error(400, { message: "Клиент не найден" });
      }

      const link = buildShareLink(client.inbound, client);
      if (!link) {
        return error(400, { message: "Протокол не поддерживается" });
      }

      return { success: true, link };
    },
    { params: t.Object({ uuid: t.String({ format: "uuid" }) }) }
  )

  .get(
    "/:uuid/qr",
    async ({ params: { uuid }, error, set }) => {
      const client = await ClientModel.getWithInbound(uuid);
      if (!client || !client.inbound) {
        return error(400, { message: "Клиент не найден" });
      }

      const link = buildShareLink(client.inbound, client);
      if (!link) {
        return error(400, { message: "Протокол не поддерживается" });
      }

      const QRCode = await import("qrcode");
      const svg = await QRCode.toString(link, { type: "svg", margin: 2 });

      set.headers["Content-Type"] = "image/svg+xml";
      return svg;
    },
    { params: t.Object({ uuid: t.String({ format: "uuid" }) }) }
  );
