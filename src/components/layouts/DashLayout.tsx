import { Html } from "@elysiajs/html";

type Tab = "overview" | "inbounds" | "clients";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "overview", label: "Обзор", href: "/dashboard" },
  { key: "inbounds", label: "Inbounds", href: "/dashboard/inbounds" },
  { key: "clients", label: "Клиенты", href: "/dashboard/clients" },
];

// Полноценная HTML-страница дашборда. Переключение вкладок — обычная
// навигация браузера (<a href>), а не hx-swap: так "активная" вкладка
// в сайдбаре всегда правильная без единой строчки JS для этого.
// Живые данные внутри страницы (метрики) обновляются через htmx-поллинг
// на уровне конкретного фрагмента — см. /dashboard/fragments/metrics.
export const DashboardLayout = ({
  active,
  title,
  children,
}: {
  active: Tab;
  title: string;
  children: JSX.Element | JSX.Element[];
}) => (
  <html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title} — XPanel</title>
      <script src="https://unpkg.com/htmx.org@2.0.4"></script>
      <link rel="stylesheet" href="/public/dashboard.css" />
    </head>
    <body>
      <div class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div class="brand-lockup">
            <span class="brand-mark">X</span>
            <div>
              <strong>XPanel</strong>
              <span>XRAY CONTROL</span>
            </div>
          </div>

          <nav class="sidebar-nav">
            <p class="nav-label">Управление</p>
            {TABS.map((tab) => (
              <a
                href={tab.href}
                class={`nav-item ${active === tab.key ? "is-active" : ""}`}
              >
                <span class="nav-dot" />
                {tab.label}
              </a>
            ))}
          </nav>

          <div class="sidebar-footer">
            <div class="user-avatar">AD</div>
            <div>
              <strong>admin</strong>
              <span>Администратор</span>
            </div>
            <a href="/auth/logout" class="logout-button" title="Выйти">
              ↗
            </a>
          </div>
        </aside>

        <main class="dashboard-main">
          <header class="dashboard-header">
            <div>
              <p class="breadcrumb">
                Панель управления <span>/</span> {title}
              </p>
              <h1>{title}</h1>
            </div>
          </header>

          {children}
        </main>
      </div>
    </body>
  </html>
);