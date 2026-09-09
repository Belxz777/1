import Elysia, { redirect } from "elysia";
import jwt from "@elysiajs/jwt";

import { env } from "../config";
import { getTokenFromCookie } from "../services/auth";

export const pageGuard = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: env.auth.jwtSecret,
    })
  )

  .derive({ as: "scoped" }, async ({ jwt, request }) => {
    const token = getTokenFromCookie(request);

    const payload = token
      ? await jwt.verify(token)
      : undefined;

    return {
      authenticated: !!payload,
    };
  })

  .onBeforeHandle({ as: "scoped" }, ({ authenticated }) => {

    if (!authenticated) {
      return redirect("/auth/login");
    }
  });
/*
Открывает /dashboard
        ↓
Берём JWT из Cookie
        ↓
Проверяем jwt.verify()
        ↓
JWT валидный?
    ↓           ↓
   ДА          НЕТ
    ↓           ↓
Dashboard    /auth/login 
*/