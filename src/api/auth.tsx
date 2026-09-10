import Elysia, { t } from "elysia";
import jwt from "@elysiajs/jwt";
import { Html } from "@elysiajs/html";
import { env } from "../config";

import {
  verifyPassword,
  setAdminPassword,
  isAdminRegistered,
  getAdminPasswordHash,
  clearAdmin,
} from "../services/auth";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";



export const auth = new Elysia({
  prefix: "/auth",
})

  .use(
    jwt({
      name: "jwt",

      secret:
        env.auth.jwtSecret,

      exp: "7d",
    })
  )

  .get(
    "/login",

    () => {
      return <LoginPage />;
    }
  )


  .get(
    "/register",

    () => {
      return <RegisterPage />;
    }
  )


    .post(
    "/register",
    async ({ body, jwt }) => {
      let isResetOccurred = false;

      // 1. Проверяем, зарегистрирован ли уже админ
      if (await isAdminRegistered()) {
        // Удаляем старого админа из базы данных
        await clearAdmin();
        // Запоминаем факт сброса, чтобы передать в интерфейс страницы
        isResetOccurred = true; 
      }

      // 2. Хешируем и сохраняем новый пароль (для нового или сброшенного админа)
      await setAdminPassword(body.password);

      // 3. Выпускаем JWT-токен для автоматического входа
      const token = await jwt.sign({
        role: "admin",
      });

      // 4. Если произошел сброс, мы МОЖЕМ либо сразу пустить в дашборд, 
      // либо вернуть страницу с уведомлением. 
      // Обычно лучше сразу авторизовать и перенаправить, но добавить флаг в URL:
      if (isResetOccurred) {
        return new Response(
          null,
          {
            status: 302,
            headers: {
              // Перенаправляем на дашборд с query-параметром о сбросе
              Location: "/dashboard?message=admin_reset",
              "Set-Cookie":
                `token=${token}; ` +
                `HttpOnly; ` +
                `Path=/; ` +
                `Max-Age=${7 * 24 * 3600}; ` +
                `SameSite=Lax`,
            },
          }
        );
      }

      // Стандартный ответ, если админа не было (первая регистрация)
      return new Response(
        null,
        {
          status: 302,
          headers: {
            Location: "/dashboard",
            "Set-Cookie":
              `token=${token}; ` +
              `HttpOnly; ` +
              `Path=/; ` +
              `Max-Age=${7 * 24 * 3600}; ` +
              `SameSite=Lax`,
          },
        }
      );
    },
    {
      body: t.Object({
        name: t.String({ minLength: 3 }),
        password: t.String({ minLength: 6 }),
      }),
    }
  )

  .post(
    "/login",

    async ({ body, jwt }) => {

      if (
        !await isAdminRegistered()
      ) {

        return (
          <LoginPage
            error="Администратор не зарегистрирован"
          />
        );

      }


      const stored =
        await getAdminPasswordHash();


      if (!stored) {

        return (
          <LoginPage
            error="Ошибка сервера"
          />
        );

      }


      const valid =
        await verifyPassword(
          body.password,
          stored
        );


      if (!valid) {

        return (
          <LoginPage
            error="Неверный пароль"
          />
        );

      }


      const token =
        await jwt.sign({
          role: "admin",
        });


      return new Response(
        null,
        {
          status: 302,

          headers: {

            Location:
              "/dashboard",

            "Set-Cookie":
              `token=${token}; ` +
              `HttpOnly; ` +
              `Path=/; ` +
              `Max-Age=${7 * 24 * 3600}; ` +
              `SameSite=Lax`,

          },
        }
      );

    },


    {
      body: t.Object({

        name:
          t.String(),

        password:
          t.String(),

      }),
    }
  )
  .get("/logout", () => {
  return new Response(null, {
    status: 302,

    headers: {
      Location: "/",

      "Set-Cookie":
        "token=; " +
        "HttpOnly; " +
        "Path=/; " +
        "Max-Age=0; " +
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT; " +
        "SameSite=Lax",
    },
  });
});

