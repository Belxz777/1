import { AuthLayout } from "@/components/layouts/AuthLayout.tsx";
import { Html } from "@elysiajs/html";
interface LoginPageProps {
  error?: string;
}

export const LoginPage = ({ error }: LoginPageProps) => {
  const nm = "Вход в систему"; // Переименовал для логичности, но оставил переменную
  
  return (
    <AuthLayout title="Вход">
      {/* Добавил bg-zinc-900 для темного фона, так как в body стоит светлый */}
      <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-900 px-4 py-12">
        
        {/* Карточка формы */}
        <div class="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          
          {/* Заголовок */}
          <div class="mb-8 flex flex-col items-center text-center">
            <h1 class="text-2xl font-bold tracking-tight text-white">
              {nm}
            </h1>
         
          </div>

          <form method="POST" action="/auth/login" class="space-y-5">
            
            {/* Поле Имя */}
            <div>
              <label for="name" class="mb-2 block text-sm font-medium text-zinc-300">
                Имя
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autocomplete="username"
                placeholder="admin"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Поле Пароль */}
            <div>
              <label for="password" class="mb-2 block text-sm font-medium text-zinc-300">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Блок ошибки */}
            {error && (
              <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Кнопка отправки (использует доступный в CSS bg-indigo-600) */}
                 <button
              type="submit"
              class="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:text-white active:scale-[0.98]"
            >
          
              Войти
            </button>
          </form>

          {/* Разделитель */}
          <div class="my-6 h-px bg-zinc-800" />

          {/* Ссылка на регистрацию */}
          <p class="text-center text-sm text-zinc-400">
            Нет аккаунта?{" "}
            <a
              href="/auth/register"
             class="font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Зарегистрироваться
            </a>
          </p>
        </div>
      </main>
    </AuthLayout>
  );
};