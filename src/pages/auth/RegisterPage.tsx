import { AuthLayout } from "@/components/layouts/AuthLayout.tsx";
import { Html } from "@elysiajs/html";
interface RegisterPageProps {
  error?: string;
}

export const RegisterPage = ({
  error,
}: RegisterPageProps) => {

  return (

    <AuthLayout title="Регистрация">

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

            <h1 class="text-2xl font-semibold">
              Регистрация
            </h1>

            <p class="mt-2 text-sm text-zinc-400">
              Создание администратора XPanel
            </p>

          </div>


          <form
            method="POST"
            action="/auth/register"
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
                minlength="3"
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
                minlength="6"
                autocomplete="new-password"
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
              "
            >
              Создать администратора
            </button>

          </form>


          <p class="mt-6 text-center text-sm text-zinc-400">

            Уже зарегистрированы?

            <a
              href="/auth/login"
              class="
                ml-1
                text-indigo-400
                hover:text-indigo-300
              "
            >
              Войти
            </a>

          </p>

        </div>

      </main>

    </AuthLayout>

  );
};
