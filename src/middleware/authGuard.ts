import Elysia from "elysia";
import jwt from "@elysiajs/jwt";
import { env } from "../config";

export const authGuard = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: env.auth.jwtSecret,
    })
  )
  .derive({ as: "scoped" }, async ({ jwt, headers, status }) => {
    const auth = headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      status(401)
      return { message: "Unauthorized" };
    }

    const payload = await jwt.verify(auth.slice(7));
    if (!payload) {
      status(401)
      return { message: "Invalid token" };
    }

    return { user: payload as { role: string } };
  });
