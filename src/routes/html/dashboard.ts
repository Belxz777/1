import Elysia from "elysia";
import { dbPlugin } from "../../database/plugin";
import type { SystemStats, Client, Inbound, OnlineUser } from "@/types/api";
export const dash = new Elysia()
  .use(dbPlugin)
  
  .get("/dashboard", () => {
    return new Response(
      `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XPanel Dashboard</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>${dashboardCSS}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🦊 XPanel</h1>
      <div class="user-menu">
        <a href="/logout" class="btn-logout">Выход</a>
      </div>
    </header>

    <nav class="sidebar">
      <ul>
        <li><a href="#" hx-get="/dashboard/stats" hx-target="#content" class="nav-link active">Статистика</a></li>
        <li><a href="#" hx-get="/dashboard/inbounds" hx-target="#content" class="nav-link">Inbounds</a></li>
        <li><a href="#" hx-get="/dashboard/settings" hx-target="#content" class="nav-link">Настройки</a></li>
      </ul>
    </nav>

    <main id="content" class="content">
      <div hx-get="/dashboard/stats" hx-trigger="load" hx-swap="innerHTML"></div>
    </main>
  </div>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  })

  // ===== СТАТИСТИКА =====

.get("/dashboard/stats", async () => {
  try {
    const [statsRes, onlineRes] = await Promise.all([
      fetch("http://localhost:3000/system/all?unit=mb"),
      fetch("http://localhost:3000/xray/api/online"),
    ]);

    const sysStats: SystemStats = await statsRes.json();
    const onlineData:any = await onlineRes.json();

    const onlineUsers: OnlineUser[] = onlineData.users ?? [];
    // Расчет CPU usage среднее значение по ядрам
    const cpuUsage = sysStats.cpu.load.reduce((sum, core) => {
      const activeTime = core.usage.user + core.usage.sys + core.usage.irq;
      return sum + (activeTime / core.total) * 100;
    }, 0) / sysStats.cpu.cores;

    // Форматирование uptime
    const uptimeHours = Math.floor(sysStats.system.uptime / 3600);
    const uptimeDays = Math.floor(uptimeHours / 24);
    const uptimeStr = uptimeDays > 0 
      ? `${uptimeDays}д ${uptimeHours % 24}ч`
      : `${uptimeHours}ч`;

    // Общий трафик всех онлайн пользователей
    const totalTraffic = onlineUsers.reduce(
    (acc, user) => ({
    upload: acc.upload + (user.traffic?.upload || 0),
    download: acc.download + (user.traffic?.download || 0),
  }),
  { upload: 0, download: 0 }
    );

    return new Response(
      `<div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">CPU (${sysStats.cpu.cores} cores)</div>
          <div class="stat-value">${cpuUsage.toFixed(1)}%</div>
          <div class="stat-sub">Load avg: ${sysStats.loadavg[0].toFixed(2)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Память</div>
          <div class="stat-value">${sysStats.memory.usagePercent.toFixed(1)}%</div>
          <div class="stat-sub">${formatBytes(sysStats.memory.used * 1024 * 1024)} / ${formatBytes(sysStats.memory.total * 1024 * 1024)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Онлайн пользователей</div>
          <div class="stat-value">${onlineUsers.length}</div>
          <div class="stat-sub">↓ ${formatBytes(totalTraffic.download)}/s</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value">${uptimeStr}</div>
          <div class="stat-sub">${sysStats.system.hostname}</div>
        </div>
      </div>

      <div class="cpu-chart">
        <h3>CPU по ядрам</h3>
        <div class="cores-grid">
          ${sysStats.cpu.load.map((core, i) => {
            const usage = ((core.usage.user + core.usage.sys + core.usage.irq) / core.total) * 100;
            return `<div class="core-bar"><small>#${i}</small><div class="bar-fill" style="width: ${usage}%; background: ${usage > 80 ? '#e74c3c' : usage > 50 ? '#f39c12' : '#27ae60'}"></div><small>${usage.toFixed(0)}%</small></div>`;
          }).join('')}
        </div>
      </div>

      <div hx-get="/dashboard/stats" hx-trigger="every 5s" hx-swap="outerHTML swap:1s"></div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.log(err)
    return new Response(
      `<div class="error-card">❌ Ошибка загрузки статистики</div>
       <div hx-get="/dashboard/stats" hx-trigger="every 10s" hx-swap="outerHTML swap:1s"></div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
})

  // ===== INBOUNDS (список) =====
  .get("/dashboard/inbounds", async () => {
    const inbounds:Array<Inbound> = await fetch("http://localhost:3000/xray/inbounds").then(r => r.json());

    return new Response(
      `<div class="inbounds-container">
        <div class="section-header">
          <h2>Inbounds</h2>
          <button hx-get="/dashboard/inbounds/form" hx-target="#content" class="btn btn-primary">+ Новый</button>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Протокол</th>
              <th>Порт</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${inbounds.map((ib: any) => `
              <tr>
                <td>${ib.tag}</td>
                <td>${ib.protocol}</td>
                <td>${ib.port}</td>
                <td><span class="badge badge-success">Активен</span></td>
                <td>
                  <button hx-get="/dashboard/inbounds/${ib.id}/clients" hx-target="#content" class="btn btn-sm">Клиенты</button>
                  <button hx-get="/dashboard/inbounds/${ib.id}/edit" hx-target="#content" class="btn btn-sm">Редакт.</button>
                  <button hx-delete="/xray/inbounds/${ib.id}" hx-confirm="Удалить?" hx-swap="outerHTML swap:1s" class="btn btn-sm btn-danger">Удалить</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  })

  // ===== CLIENTS (по inbound) =====
  .get("/dashboard/inbounds/:id/clients", async ({ params }) => {
    const clients:Array<Client> = await fetch(`http://localhost:3000/xray/inbounds/${params.id}/clients`)
      .then(r => r.json());

    return new Response(
      `<div class="clients-container">
        <div class="section-header">
          <h2>Клиенты</h2>
          <button hx-get="/dashboard/inbounds/${params.id}/clients/form" hx-target="#modal" class="btn btn-primary">+ Добавить</button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Статус</th>
              <th>Трафик (↓/↑)</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map((c: any) => `
              <tr>
                <td>${c.email}</td>
                <td>
                  <button 
                    hx-patch="/xray/clients/${c.id}/toggle"
                    hx-vals='{"enabled": ${!c.enabled}}'
                    hx-swap="outerHTML swap:1s"
                    class="badge ${c.enabled ? 'badge-success' : 'badge-gray'}"
                  >
                    ${c.enabled ? '✓ Активен' : '✗ Отключен'}
                  </button>
                </td>
                <td>${formatBytes(c.down || 0)} / ${formatBytes(c.up || 0)}</td>
                <td>
                  <button hx-delete="/xray/clients/${c.id}" hx-confirm="Удалить клиента?" class="btn btn-sm btn-danger">Удалить</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  })

  // ===== ФОРМА ДОБАВЛЕНИЯ КЛИЕНТА =====
  .get("/dashboard/inbounds/:id/clients/form", ({ params }) => {
    return new Response(
      `<div class="modal-content">
        <h3>Добавить клиента</h3>
        <form hx-post="/xray/inbounds/${params.id}/clients" hx-swap="outerHTML swap:1s">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Протокол</label>
            <select name="protocol" required>
              <option>vmess</option>
              <option>vless</option>
              <option>trojan</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Добавить</button>
        </form>
      </div>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  });

const dashboardCSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; background: #f5f5f5; color: #333; }
  
  .container { display: grid; grid-template-columns: 250px 1fr; grid-template-rows: 60px 1fr; height: 100vh; }
  
  .header { grid-column: 1 / -1; background: #2c3e50; color: white; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .header h1 { font-size: 24px; }
  .btn-logout { color: white; text-decoration: none; padding: 8px 16px; background: #e74c3c; border-radius: 4px; }
  
  .sidebar { background: white; border-right: 1px solid #ddd; padding: 20px 0; }
  .sidebar ul { list-style: none; }
  .sidebar li { margin: 0; }
  .nav-link { display: block; padding: 12px 20px; text-decoration: none; color: #333; border-left: 4px solid transparent; transition: all 0.2s; }
  .nav-link:hover, .nav-link.active { background: #ecf0f1; border-left-color: #3498db; color: #3498db; }
  
  .content { grid-column: 2; padding: 20px; overflow-y: auto; }
  
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
  .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .stat-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 10px; }
  .stat-value { font-size: 28px; font-weight: bold; color: #3498db; }
  
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .section-header h2 { font-size: 20px; }
  
  .table { width: 100%; background: white; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
  .table th { background: #34495e; color: white; padding: 12px; text-align: left; }
  .table td { padding: 12px; border-bottom: 1px solid #ecf0f1; }
  .table tr:hover { background: #f9f9f9; }
  
  .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  .btn-primary { background: #3498db; color: white; }
  .btn-danger { background: #e74c3c; color: white; }
  .btn-sm { padding: 4px 8px; font-size: 12px; }
  .btn:hover { opacity: 0.9; }
  
  .badge { padding: 4px 8px; border-radius: 3px; font-size: 12px; border: none; cursor: pointer; }
  .badge-success { background: #27ae60; color: white; }
  .badge-gray { background: #95a5a6; color: white; }
  
  .form-group { margin-bottom: 15px; }
  .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
  .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
  
  .modal-content { background: white; padding: 20px; border-radius: 8px; max-width: 500px; }
   .cpu-chart { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .cores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap: 10px; margin-top: 15px; }
  .core-bar { display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 11px; }
  .bar-fill { width: 100%; height: 20px; border-radius: 3px; }

  .stat-sub { font-size: 12px; color: #7f8c8d; margin-top: 5px; }

  .error-card { background: #fadbd8; color: #922b21; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c; }
  `;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}