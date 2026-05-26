import { Elysia } from "elysia";
import { xrayRoutes } from "./routes/xray";
import { env } from "./config";
import { pages } from "./routes/pages";
import { runMigrations } from "./database/migrate";
import swagger from "@elysiajs/swagger";
runMigrations()
console.log('🚀 Starting server with config:', {
  port: env.server.port,
  env: env.server.env,
  xrayBinary: env.xray.binary,
  logLevel: env.logging.level,
});

const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
app.use(swagger({
    path: "/docs",
    documentation: { info: { title: "XPanel API", version: "1.0.0" } }
  }))

app.use(xrayRoutes);
app.use(pages)