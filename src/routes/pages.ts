import Elysia from "elysia";
import jwt from "@elysiajs/jwt";
import { env } from "../config";
import { getTokenFromCookie } from "../services/auth";
 
// Корень "/" ничего сам не рисует — просто решает,
// куда отправить: в дашборд (если есть валидный токен)
// или на страницу входа.
export const pages = new Elysia()
  .use(jwt({ name: "jwt", secret: env.auth.jwtSecret }))
  .get("/", async ({ request, jwt, set }) => {
    const token = getTokenFromCookie(request);
    const payload = token ? await jwt.verify(token) : null;
 
    set.status = 302;
    set.headers["Location"] = payload ? "/dashboard" : "/auth/login";
    return "";
  });
 
