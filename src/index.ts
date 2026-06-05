import { Elysia } from "elysia";
import { xrayRoutes } from "./routes/xray";
import { env } from "./config";
import { pages } from "./routes/pages";
import { subRoutes, shareRoutes } from "./routes/subscription";
import { authRoutes } from "./routes/auth";
import swagger from "@elysiajs/swagger";
import html from "@elysiajs/html";
import { systemData } from "./system/status";

console.log('🚀 Starting server with config:', {
  port: env.server.port,
  env: env.server.env,
  xrayBinary: env.xray.binary,
  logLevel: env.logging.level,
  publicHost: env.publicHost,
});

const app = new Elysia()
  .use(html())
  .use(swagger({
    path: "/docs",
    documentation: { info: { title: "XPanel API", version: "1.0.0" } }
  }))//документация
  .use(systemData)
  .use(authRoutes) // login register me 
  .use(xrayRoutes)
  .use(pages)
  .use(subRoutes)
  .use(shareRoutes)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);