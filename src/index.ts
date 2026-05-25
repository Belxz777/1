import { Elysia } from "elysia";
import { xrayRoutes } from "./routes/xray";
import { env } from "./config";

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


app.use(xrayRoutes);