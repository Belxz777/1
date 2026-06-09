import { Elysia } from "elysia";
import { xrayRoutes } from "./routes/api/xray";
import { env } from "./config";
import { pages } from "./routes/pages";
import { subRoutes, shareRoutes } from "./routes/api/subscription";
import { authRoutes } from "./routes/html/auth";
import swagger from "@elysiajs/swagger";
import html from "@elysiajs/html";
import { systemData } from "./system/status";
import { loggingMiddleware } from "./logging/middleware";
import { dash } from "./routes/html/dashboard";

console.log('🚀 Starting server with config:', {
  port: env.server.port,
  env: env.server.env,
  xrayBinary: env.xray.binary,
  logLevel: env.logging.level,
  publicHost: env.publicHost,
});

const app = new Elysia()
  .use(loggingMiddleware)
  .use(html())
  .use(swagger({
    path: "/docs",
    documentation: { info: { title: "XPanel API", version: "1.0.0" } }
  }))//документация
  .use(systemData)
  .use(authRoutes) // login register me 
  .use(dash)
  .use(xrayRoutes) // xray status , inbounds and users (crud), grpc format data
  .use(pages) 
  .use(subRoutes)
  .use(shareRoutes)
  .listen(3000);

