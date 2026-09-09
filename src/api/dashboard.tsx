import Elysia, { t } from "elysia";
import { html, Html } from "@elysiajs/html";
import { dbPlugin } from "@/database/plugin";
import { pageGuard } from "@/middleware/pageGuard";
import { InboundModel } from "@/models/inbound";
import { ClientModel, ClientCreateSchema } from "@/models/client";
import { getAllOnlineUsers } from "@/services/xray/api";
import { getXrayVersion, isXrayRunning } from "@/services/xray/manage";
import { getSystemSnapshot } from "@/system/status";
import { formatBytes, formatUptime } from "@/utils/format";
import { MetricCard } from "@/pages/comps/MetricCard";
import { DashboardLayout } from "@/components/layouts/DashLayout";
import { InboundTable } from "@/pages/comps/Inbounds";
import { ClientTable } from "@/pages/comps/ClientTable";

// ── Живой фрагмент метрик (обновляется поллингом, а не всей страницей) ──
// ! hellow
const MetricsFragment = async () => {
  const snap = getSystemSnapshot();

  const [running, version, online] = await Promise.all([
    isXrayRunning().catch(() => false),
    getXrayVersion().catch(() => "—"),
    getAllOnlineUsers().catch(() => ({ users: [] as any[] })),
  ]);

  return (
    <>
      <section class="metrics-grid">
        <MetricCard
          label="Статус Xray"
          value={running ? "Работает" : "Остановлен"}
          detail={running ? "Сервис активен" : "Проверьте systemctl/процесс"}
          tone={running ? "green" : "orange"}
        />
        <MetricCard
          label="Онлайн сейчас"
          value={String(online.users?.length ?? 0)}
          detail="Активных подключений"
          tone="blue"
        />
        <MetricCard
          label="CPU нагрузка"
          value={`${snap.cpu.usagePercent}%`}
          detail={`Load avg ${snap.loadavg[0].toFixed(2)}`}
          tone="purple"
        />
        <MetricCard
          label="Память"
          value={`${snap.memory.usagePercent}%`}
          detail={`${formatBytes(snap.memory.used)} / ${formatBytes(snap.memory.total)}`}
          tone="orange"
        />
      </section>

      <section class="content-grid">
        <article class="panel system-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Мониторинг</p>
              <h2>Состояние сервера</h2>
            </div>
          </div>
          <div class="system-rows">
            <div>
              <span>Hostname</span>
              <strong>{snap.system.hostname}</strong>
            </div>
            <div>
              <span>Uptime</span>
              <strong>{formatUptime(snap.system.uptime)}</strong>
            </div>
            <div>
              <span>Версия Xray</span>
              <strong>{version.output}</strong>
            </div>
            <div>
              <span>Платформа</span>
              <strong>
                {snap.system.platform}/{snap.system.arch}
              </strong>
            </div>
          </div>
        </article>

        <article class="panel activity-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Прямо сейчас</p>
              <h2>CPU по ядрам</h2>
            </div>
          </div>
          <div class="cores-grid">
            {snap.cpu.load.map((core, i) => {
              const usage = ((core.usage.user + core.usage.sys + core.usage.irq) / core.total) * 100;
              return (
                <div class="core-bar">
                  <small>#{i}</small>
                  <div class="bar-track">
                    <div
                      class="bar-fill"
                      style={`width:${usage.toFixed(0)}%; background:${
                        usage > 80 ? "#e74c3c" : usage > 50 ? "#f39c12" : "#27ae60"
                      }`}
                    />
                  </div>
                  <small>{usage.toFixed(0)}%</small>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
};

export const dashboard = new Elysia()
   .use(pageGuard)
  .use(html())
  .use(dbPlugin)
  

  // ==================== ОБЗОР ====================
  .get("/dashboard", async () => {
    const recent = (await InboundModel.getAllWithClients()).slice(0, 3);
    console.log(recent)
    return (
      <DashboardLayout active="overview" title="Обзор системы">
        <div
          id="metrics"
          hx-get="/dashboard/fragments/metrics"
          hx-trigger="load, every 5s"
          hx-swap="innerHTML"
        >
          Загрузка…
        </div>

        <section class="panel table-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Конфигурация</p>
              <h2>Активные inbounds</h2>
            </div>
            <a href="/dashboard/inbounds" class="text-button">
              Посмотреть все →
            </a>
          </div>
          <InboundTable inbounds={recent} />
        </section>
      </DashboardLayout>
    );
  })

  .get("/dashboard/fragments/metrics", () => <MetricsFragment />)

  // ==================== INBOUNDS ====================
  .get("/dashboard/inbounds", async () => {
    const inbounds = await InboundModel.getAllWithClients();
    console.log(inbounds)
    return (
      <DashboardLayout active="inbounds" title="Inbounds">
        <section class="panel table-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Конфигурация Xray</p>
              <h2>Все inbounds</h2>
            </div>
          </div>
          <InboundTable inbounds={inbounds} />
        </section>
      </DashboardLayout>
    );
  })

  // ==================== CLIENTS (все, по всем inbound'ам) ====================
  .get("/dashboard/clients", async () => {
    const inbounds = await InboundModel.getAllWithClients();
    const clients = inbounds.flatMap((ib) =>
      ib.clients.map((c: any) => ({ ...c, inboundTag: ib.tag }))
    );
    return (
      <DashboardLayout active="clients" title="Клиенты">
        <section class="panel table-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Пользователи</p>
              <h2>Все клиенты</h2>
            </div>
          </div>
          <ClientTable clients={clients} showInboundColumn />
        </section>
      </DashboardLayout>
    );
  })

  // ==================== CLIENTS (по конкретному inbound'у) ====================
  .get(
    "/dashboard/inbounds/:id/clients",
    async ({ params }) => {
      const inbound = await InboundModel.getById(params.id);
      const clients = await ClientModel.getAllByInbound(params.id);

      return (
        <DashboardLayout active="inbounds" title={`Клиенты — ${inbound?.tag ?? params.id}`}>
          <section class="panel table-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">Inbound</p>
                <h2>{inbound?.tag ?? "—"}</h2>
              </div>
              <button
                hx-get={`/dashboard/inbounds/${params.id}/clients/form`}
                hx-target="#modal"
                hx-swap="innerHTML"
                class="primary-button"
              >
                + Добавить клиента
              </button>
            </div>
            <ClientTable clients={clients} />
          </section>
          <div id="modal" />
        </DashboardLayout>
      );
    },
    { params: t.Object({ id: t.Numeric() }) }
  )

  // ==================== ФОРМА ДОБАВЛЕНИЯ КЛИЕНТА (htmx-модалка) ====================
  .get(
    "/dashboard/inbounds/:id/clients/form",
    ({ params }) => (
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Добавить клиента</h3>
          <form
            hx-post={`/xray/inbounds/${params.id}/clients`}
            hx-target={`#modal`}
            hx-swap="innerHTML"
          >
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" name="email" required />
            </div>
            <div class="form-group">
              <label for="protocol">Протокол</label>
              <select id="protocol" name="protocol" required>
                <option>vmess</option>
                <option>vless</option>
                <option>trojan</option>
              </select>
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="text-button"
                hx-get="/dashboard/fragments/empty"
                hx-target="#modal"
                hx-swap="innerHTML"
              >
                Отмена
              </button>
              <button type="submit" class="primary-button">
                Добавить
              </button>
            </div>
          </form>
        </div>
      </div>
    ),
    { params: t.Object({ id: t.Numeric() }) }
  )

  .get("/dashboard/fragments/empty", () => "");
