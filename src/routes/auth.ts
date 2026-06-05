import Elysia, { t } from "elysia";
import jwt from "@elysiajs/jwt";
import { env } from "../config";
import {
  verifyPassword,
  setAdminPassword,
  isAdminRegistered,
  getAdminPasswordHash,
} from "../services/auth";

const loginPage = (error?: string) => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вход</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f4f5;
      color: #18181b;
    }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 360px;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.8rem; color: #71717a; margin-bottom: 4px; margin-top: 1rem; }
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color .15s;
    }
    input:focus { border-color: #6366f1; }
    button {
      margin-top: 1.5rem;
      width: 100%;
      padding: 9px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background .15s;
    }
    button:hover { background: #4f46e5; }
    .error {
      margin-top: 1rem;
      padding: 8px 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #dc2626;
    }
    .link { margin-top: 1rem; text-align: center; font-size: 0.85rem; color: #71717a; }
    .link a { color: #6366f1; text-decoration: none; }
    .link a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Вход в панель</h1>
    <form method="POST" action="/auth/login">
      <label for="name">Имя</label>
      <input id="name" name="name" type="text" autocomplete="username" required>
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      ${error ? `<div class="error">${error}</div>` : ""}
      <button type="submit">Войти</button>
    </form>
    <p class="link"><a href="/auth/register">Нет аккаунта? Зарегистрироваться</a></p>
  </div>
</body>
</html>`;

const registerPage = (error?: string) => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Регистрация</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f4f5;
      color: #18181b;
    }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 360px;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.8rem; color: #71717a; margin-bottom: 4px; margin-top: 1rem; }
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color .15s;
    }
    input:focus { border-color: #6366f1; }
    button {
      margin-top: 1.5rem;
      width: 100%;
      padding: 9px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background .15s;
    }
    button:hover { background: #4f46e5; }
    .error {
      margin-top: 1rem;
      padding: 8px 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #dc2626;
    }
    .link { margin-top: 1rem; text-align: center; font-size: 0.85rem; color: #71717a; }
    .link a { color: #6366f1; text-decoration: none; }
    .link a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Регистрация админа</h1>
    <form method="POST" action="/auth/register">
      <label for="name">Имя</label>
      <input id="name" name="name" type="text" autocomplete="username" required minlength="3">
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" autocomplete="new-password" required minlength="6">
      ${error ? `<div class="error">${error}</div>` : ""}
      <button type="submit">Зарегистрироваться</button>
    </form>
    <p class="link"><a href="/auth/login">Уже есть аккаунт? Войти</a></p>
  </div>
</body>
</html>`;

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.auth.jwtSecret,
      exp: "7d",
    })
  )

  // ── Страницы ────────────────────────────────────────────────
  .get("/login", () => new Response(loginPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }))

  .get("/register", () => new Response(registerPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }))

  // ── Регистрация ─────────────────────────────────────────────
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      // Форма шлёт application/x-www-form-urlencoded
      if (await isAdminRegistered()) {
        return new Response(registerPage("Администратор уже зарегистрирован"), {
          status: 409,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      await setAdminPassword(body.password);
      const token = await jwt.sign({ role: "admin" });
      console.log("reg sucess ")
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard",
          "Set-Cookie": `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
        },
      });
        
    },
    
    {
      body: t.Object({
        name: t.String({ minLength: 3 }),
        password: t.String({ minLength: 6 }),
      }),
    
    }
  )

  // ── Вход ────────────────────────────────────────────────────
  .post(
    "/login",
    async ({ body, jwt }) => {
      if (!await isAdminRegistered()) {
        return new Response(loginPage("Администратор не зарегистрирован"), {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const stored = await getAdminPasswordHash();
      if (!stored) {
        return new Response(loginPage("Внутренняя ошибка сервера"), {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const valid = await verifyPassword(body.password, stored);
      if (!valid) {
        return new Response(loginPage("Неверный пароль"), {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const token = await jwt.sign({ role: "admin" });
    console.log("login sucess ")
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard",
          "Set-Cookie": `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
        },
      });
    },
    {
      body: t.Object({
        name: t.String(),
        password: t.String(),
      }),
    }
  )

  // ── /me — читаем cookie вместо заголовка ────────────────────
  .get(
    "/me",
    async ({ jwt, request, set }) => {
      const cookie = request.headers.get("cookie") ?? "";
      const token = cookie.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1];

      if (!token) {
        set.status = 401;
        return { message: "Not authenticated" };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return { message: "Invalid token" };
      }

      return { success: true, role: payload.role };
    }
  )

  // ── Выход ───────────────────────────────────────────────────
  .get("/logout", () =>
    new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/login",
        "Set-Cookie": "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
      },
    })
  );