import { AuthLayout } from "@/components/layouts/AuthLayout.tsx";
import { Html } from "@elysiajs/html";
interface LoginPageProps {
  error?: string;
}

export const LoginPage = ({
  error,
}: LoginPageProps) => {
  const nm =  "nbdsdadsa";
  return (
    <AuthLayout title="Вход">

      <main
        class="
          flex
          min-h-screen
          items-center
          justify-center
          px-4
        "
      >

        <div
          class="
            w-full
            max-w-md
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-8
            shadow-xl
          "
        >

          <div class="mb-8">

            <h1
              class="
                text-2xl
                font-semibold
                tracking-tight
              "
            >
              ${nm}
            </h1>

            <p class="mt-2 text-sm text-zinc-400">
              Вход в панель управления
            </p>

          </div>


          <form
            method="POST"
            action="/auth/login"
            class="space-y-5"
          >

            <div>

              <label
                for="name"
                class="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-zinc-300
                "
              >
                Имя
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                autocomplete="username"
                class="
                  w-full
                  rounded-lg
                  border
                  border-zinc-700
                  bg-zinc-800
                  px-4
                  py-2.5
                  text-sm
                  outline-none
                  transition
                  placeholder:text-zinc-500
                  focus:border-indigo-500
                  focus:ring-2
                  focus:ring-indigo-500/20
                "
              />

            </div>


            <div>

              <label
                for="password"
                class="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-zinc-300
                "
              >
                Пароль
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                class="
                  w-full
                  rounded-lg
                  border
                  border-zinc-700
                  bg-zinc-800
                  px-4
                  py-2.5
                  text-sm
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:ring-2
                  focus:ring-indigo-500/20
                "
              />

            </div>


            {error && (

              <div
                class="
                  rounded-lg
                  border
                  border-red-500/30
                  bg-red-500/10
                  px-4
                  py-3
                  text-sm
                  text-red-400
                "
              >
                {error}
              </div>

            )}


            <button
              type="submit"
              class="
                w-full
                rounded-lg
                bg-indigo-600
                px-4
                py-3
                text-sm
                font-medium
                text-white
                transition
                hover:bg-indigo-500
                active:scale-[0.98]
              "
            >
              Войти
            </button>

          </form>


          <div
            class="
              my-6
              h-px
              bg-zinc-800
            "
          />


          <p class="text-center text-sm text-zinc-400">

            Нет аккаунта?

            <a
              href="/auth/register"
              class="
                ml-1
                text-indigo-400
                hover:text-indigo-300
              "
            >
              Зарегистрироваться
            </a>

          </p>

        </div>

      </main>

    </AuthLayout>
  );
};
