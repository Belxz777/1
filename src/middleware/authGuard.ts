import Elysia from "elysia";
import jwt from "@elysiajs/jwt";
import { env } from "../config";
import { getTokenFromCookie } from "../services/auth";

// JSON-guard: для API-роутов (/xray/*). При провале отдаёт 401 + JSON —
// это то, что ожидает и внешний сервис-интегратор с Bearer-токеном,
// и htmx-фрагмент дашборда.
export const authGuard = new Elysia()
  .use(jwt({ name: "jwt", secret: env.auth.jwtSecret }))
  .derive({ as: "scoped" }, async ({ jwt, headers, request, status }) => {
    const bearer = headers.authorization?.startsWith("Bearer ")
      ? headers.authorization.slice(7)
      : undefined;
    const token = bearer ?? getTokenFromCookie(request);

    if (!token) {
      return status(401, { message: "Unauthorized" });
    }

    const payload = await jwt.verify(token);
    if (!payload) {
      return status(401, { message: "Invalid token" });
    }

    return { user: payload as { role: string } };
  });
