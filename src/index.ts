import { Elysia } from "elysia";
import { xrayRoutes } from "./api/xray.ts";
import { env } from "./config";
import { pages } from "./routes/pages";
import { subRoutes, shareRoutes } from "./api/subscription.ts";
import staticPlugin from "@elysiajs/static";
import swagger from "@elysiajs/swagger";
import html from "@elysiajs/html";
import { systemData } from "./system/status";
import { loggingMiddleware } from "./logging/middleware";
import { dash } from "./routes/html/dashboard.tsx";
import {auth} from "./api/auth.tsx"

console.log('🚀 Starting server with config:', {
  port: env.server.port,
  env: env.server.env,
  xrayBinary: env.xray.binary,
  logLevel: env.logging.level,
  publicHost: env.publicHost,

});
//! .env настройки находится .config/env.ts
const app = new Elysia()
  .use(loggingMiddleware) // ! для логирования 
  .use(html())//html сервинг разрешен
  .use(
  staticPlugin({
    assets: "public"
  }))//для статических файлов на /public 
  // ! в данном случае для app.css (tailwind)

  .use(swagger({
    path: "/docs",
    documentation: { info: { title: "belx", version: "1.0.0" } }
  }))//! документация эндпоинтов на /docs
  .use(systemData) 
  .use(auth)
  .use(dash)
  .use(xrayRoutes) // xray status , inbounds and users (crud), grpc format data
  .use(pages) 
  .use(subRoutes)
  .use(shareRoutes)
  .listen(env.server.port);

