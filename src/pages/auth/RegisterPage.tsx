import { AuthLayout } from "@/components/layouts/AuthLayout.tsx";
import { Html } from "@elysiajs/html";
interface RegisterPageProps {
  error?: string;
}
export const RegisterPage = ({ error }: RegisterPageProps) => {
  return (
    <AuthLayout title="Регистрация">
      {/* Добавил bg-zinc-900 для затемнения фона, так как в body стоит светлый bg-zinc-100 */}
      <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-900 px-4 py-12">
        
        {/* Карточка формы */}
        <div class="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          
          {/* Логотип / Заголовок */}
          <div class="mb-8 flex flex-col items-center text-center">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 ring-1 ring-zinc-700">
           
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Создание администратора</h1>
          </div>

          <form method="POST" action="/auth/register" class="space-y-5">
            
            {/* Поле Имя */}
            <div>
              <label for="name" class="mb-2 block text-sm font-medium text-zinc-300">
                Имя пользователя
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            
                </span>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minlength="3"
                  autocomplete="username"
                  placeholder="admin"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Поле Пароль */}
            <div>
              <label for="password" class="mb-2 block text-sm font-medium text-zinc-300">
                Пароль
              </label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
               
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minlength="6"
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Блок ошибки */}
            {error && (
              <div class="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            
                <span>{error}</span>
              </div>
            )}

            {/* Кнопка отправки (использует градиент из вашего css) */}
            <button
              type="submit"
              class="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:text-white active:scale-[0.98]"
            >
              Создать администратора
             
            </button>
          </form>

          {/* Ссылка на логин */}
          <p class="mt-6 text-center text-sm text-zinc-400">
            Уже зарегистрированы?{" "}
            <a href="/auth/login" class="font-medium text-indigo-400 transition hover:text-indigo-300">
              Войти в панель
            </a>
          </p>
        </div>
      </main>
    </AuthLayout>
  );
};