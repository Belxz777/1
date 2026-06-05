import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { env } from "../config";
import { ClientModel } from "../models/client";
import { InboundModel } from "../models/inbound";
import { getSysStats, getAllOnlineUsers, queryStats } from "../services/xray/api";
import { isAdminRegistered } from "../services/auth";
import html from "@elysiajs/html";

function Layout({ title, children }: { title: string; children: any }) {
  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — XPanel</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-gray-100 min-h-screen">
        <nav class="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-6">
            <a href="/admin/dashboard" class="text-xl font-bold text-indigo-400">XPanel</a>
            <a href="/admin/dashboard" class="text-sm text-gray-300 hover:text-white">Dashboard</a>
            <a href="/admin/inbounds" class="text-sm text-gray-300 hover:text-white">Inbounds</a>
            <a href="/admin/clients" class="text-sm text-gray-300 hover:text-white">Clients</a>
            <a href="/admin/traffic" class="text-sm text-gray-300 hover:text-white">Traffic</a>
          </div>
          <button onclick="document.cookie='token=;max-age=0';location.href='/admin/login'" class="text-sm text-red-400 hover:text-red-300">Logout</button>
        </nav>
        <main class="p-6">{children}</main>
      </body>
    </html>
  );
}

function getTokenCookie(headers: Record<string, string | undefined>): string | null {
  const cookie = headers.cookie || "";
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

export const adminRoutes = new Elysia({ prefix: "/admin" }).use(html())
  .use(
    jwt({
      name: "jwt",
      secret: env.auth.jwtSecret,
    })
  )

  // ── Login/Setup — без авторизации ─────────────────────────────────────────

  .get("/login", async () => {
    const registered = await isAdminRegistered();
    const mode = registered ? "login" : "register";
    return ( <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{registered ? "Login" : "Setup"} — XPanel</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-900 flex items-center justify-center min-h-screen">
          <div class="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h1 class="text-2xl font-bold text-center text-indigo-400 mb-6">
              {registered ? "XPanel Login" : "XPanel Setup"}
            </h1>
            {!registered && <p class="text-gray-400 text-sm text-center mb-4">Set your admin password to continue</p>}
            <div id="error" class="text-red-400 text-sm mb-4 hidden"></div>
            <div id="success" class="text-green-400 text-sm mb-4 hidden"></div>
            <form id="authForm" class="space-y-4" onsubmit="return submitAuth(event, '{mode}')">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Password</label>
                <input type="password" id="password" required class="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div id="confirmGroup" class={registered ? "hidden" : ""}>
                <label class="block text-sm text-gray-400 mb-1">Confirm Password</label>
                <input type="password" id="password2" class="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold transition">
                {registered ? "Login" : "Create Admin"}
              </button>
            </form>
          </div>
          <script>{`
async function submitAuth(e, mode) {
  e.preventDefault();
  const pw = document.getElementById('password').value;
  const err = document.getElementById('error');
  const ok = document.getElementById('success');
  err.classList.add('hidden');
  ok.classList.add('hidden');

  if (mode === 'register') {
    const pw2 = document.getElementById('password2').value;
    if (pw !== pw2) {
      err.textContent = 'Passwords do not match';
      err.classList.remove('hidden');
      return false;
    }
    const r = await fetch('/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pw}) });
    const d = await r.json();
    if (d.token) {
      document.cookie = 'token=' + d.token + ';path=/;max-age=604800';
      location.href = '/admin/dashboard';
    } else {
      err.textContent = d.message || 'Setup failed';
      err.classList.remove('hidden');
    }
  } else {
    const r = await fetch('/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pw}) });
    const d = await r.json();
    if (d.token) {
      document.cookie = 'token=' + d.token + ';path=/;max-age=604800';
      location.href = '/admin/dashboard';
    } else {
      err.textContent = d.message || 'Login failed';
      err.classList.remove('hidden');
    }
  }
  return false;
}
          `}</script>
        </body>
      </html>
      )
  })

  // ── Guard: все страницы ниже требуют авторизации ───────────────────────────

  .derive({ as: "scoped" }, async ({ headers, jwt, set }) => {
    const token = getTokenCookie(headers as Record<string, string | undefined>);
    if (!token) {
      set.status = 401;
      return { authorized: false as const };
    }
    const payload = await jwt.verify(token);
    if (!payload) {
      set.status = 401;
      return { authorized: false as const };
    }
    return { authorized: true as const, user: payload };
  })

  .get("/dashboard", async ({ authorized }) => {
    if (!authorized) return new Response("Unauthorized", { status: 401 });

    const inbounds = await InboundModel.getAll();
    const allClientsData = await Promise.all(
      inbounds.map(i => ClientModel.getAllByInbound(i.id))
    );
    const totalClients = allClientsData.reduce((sum, arr) => sum + arr.length, 0);
    const activeClients = allClientsData
      .flat()
      .filter(c => ClientModel.isActive(c))
      .length;

    return (
      <Layout title="Dashboard">
        <h1 class="text-2xl font-bold mb-6">Dashboard</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-gray-800 p-6 rounded-xl">
            <div class="text-sm text-gray-400">Inbounds</div>
            <div class="text-3xl font-bold text-indigo-400">{inbounds.length}</div>
          </div>
          <div class="bg-gray-800 p-6 rounded-xl">
            <div class="text-sm text-gray-400">Clients</div>
            <div class="text-3xl font-bold text-green-400">{totalClients}</div>
          </div>
          <div class="bg-gray-800 p-6 rounded-xl">
            <div class="text-sm text-gray-400">Active</div>
            <div class="text-3xl font-bold text-emerald-400">{activeClients}</div>
          </div>
        </div>

        <div class="bg-gray-800 rounded-xl p-6">
          <h2 class="text-lg font-semibold mb-4">Inbounds</h2>
          <table class="w-full text-left">
            <thead>
              <tr class="text-gray-400 text-sm border-b border-gray-700">
                <th class="pb-2">Tag</th><th class="pb-2">Protocol</th><th class="pb-2">Port</th><th class="pb-2">Clients</th><th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inbounds.map(i => (
                <tr class="border-b border-gray-700/50">
                  <td class="py-2">{i.tag}</td>
                  <td class="py-2">{i.protocol}</td>
                  <td class="py-2">{i.port}</td>
                  <td class="py-2">{allClientsData[inbounds.indexOf(i)]?.length ?? 0}</td>
                  <td class="py-2">
                    <span class={"px-2 py-0.5 rounded text-xs " + (i.enabled ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300")}>
                      {i.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  })

  .get("/inbounds", async ({ authorized }) => {
    if (!authorized) return new Response("Unauthorized", { status: 401 });
    const inbounds = await InboundModel.getAll();
    return (
      <Layout title="Inbounds">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">Inbounds</h1>
          <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm" onclick="alert('Create form coming soon')">+ Add</button>
        </div>
        <div class="bg-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-left">
            <thead class="bg-gray-700/50">
              <tr class="text-gray-400 text-sm">
                <th class="p-3">ID</th><th class="p-3">Tag</th><th class="p-3">Protocol</th><th class="p-3">Port</th><th class="p-3">Status</th><th class="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inbounds.map(i => (
                <tr class="border-t border-gray-700/50 hover:bg-gray-700/30">
                  <td class="p-3 text-gray-400">{i.id}</td>
                  <td class="p-3">{i.tag}</td>
                  <td class="p-3">{i.protocol}</td>
                  <td class="p-3">{i.port}</td>
                  <td class="p-3">
                    <span class={"px-2 py-0.5 rounded text-xs " + (i.enabled ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300")}>
                      {i.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td class="p-3">
                    <button class="text-indigo-400 hover:text-indigo-300 text-sm mr-2">Edit</button>
                    <button class="text-red-400 hover:text-red-300 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  })

  .get("/traffic", async ({ authorized }) => {
    if (!authorized) return new Response("Unauthorized", { status: 401 });

    const [sysStats, online, userStats] = await Promise.all([
      getSysStats(),
      getAllOnlineUsers(),
      queryStats("user>>>"),
    ]);

    const inbounds = await InboundModel.getAll();
    const allClients = (await Promise.all(
      inbounds.map(i => ClientModel.getAllByInbound(i.id))
    )).flat();

    const totalUp = allClients.reduce((s, c) => s + (c.totalUploadUsed ?? 0), 0);
    const totalDown = allClients.reduce((s, c) => s + (c.totalDownloadUsed ?? 0), 0);

    return (
      <Layout title="Traffic">
        <h1 class="text-2xl font-bold mb-6">Traffic & Monitoring</h1>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-gray-800 p-4 rounded-xl">
            <div class="text-sm text-gray-400">Total Upload</div>
            <div class="text-xl font-bold text-cyan-400">{(totalUp / 1024 / 1024 / 1024).toFixed(2)} GB</div>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <div class="text-sm text-gray-400">Total Download</div>
            <div class="text-xl font-bold text-blue-400">{(totalDown / 1024 / 1024 / 1024).toFixed(2)} GB</div>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <div class="text-sm text-gray-400">Online Users</div>
            <div class="text-xl font-bold text-green-400">{online.success ? (online as any).users?.length ?? 0 : "N/A"}</div>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <div class="text-sm text-gray-400">Uptime</div>
            <div class="text-xl font-bold text-yellow-400">
              {sysStats.success
                ? Math.floor(((sysStats as any).Uptime ?? 0) / 60) + " min"
                : "N/A"}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-gray-800 rounded-xl p-6">
            <h2 class="text-lg font-semibold mb-4">Clients Traffic</h2>
            <div class="space-y-2">
              {allClients.slice(0, 20).map(c => {
                const total = (c.totalUploadUsed ?? 0) + (c.totalDownloadUsed ?? 0);
                const pct = Math.min(100, total / 1024 / 1024 / 10); // normalize to 100px bar
                return (
                  <div>
                    <div class="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{c.email}</span>
                      <span>{(total / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" style={`width:${Math.min(100, pct)}%`}></div>
                    </div>
                  </div>
                );
              })}
              {allClients.length === 0 && <p class="text-gray-500 text-sm">No clients yet</p>}
            </div>
          </div>

          <div class="bg-gray-800 rounded-xl p-6">
            <h2 class="text-lg font-semibold mb-4">System Stats</h2>
            {sysStats.success ? (
              <div class="space-y-3 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">Memory (Alloc)</span><span>{(sysStats as any).Alloc ? ((sysStats as any).Alloc / 1024 / 1024).toFixed(1) + " MB" : "N/A"}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total Alloc</span><span>{(sysStats as any).TotalAlloc ? ((sysStats as any).TotalAlloc / 1024 / 1024).toFixed(1) + " MB" : "N/A"}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Goroutines</span><span>{(sysStats as any).NumGoroutine ?? "N/A"}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">GC Cycles</span><span>{(sysStats as any).NumGC ?? "N/A"}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Live Objects</span><span>{(sysStats as any).LiveObjects ?? "N/A"}</span></div>
              </div>
            ) : (
              <p class="text-red-400 text-sm">xray API not available</p>
            )}
          </div>
        </div>

        <div class="bg-gray-800 rounded-xl p-6">
          <h2 class="text-lg font-semibold mb-4">Online Users</h2>
          {online.success ? (
            <div class="flex flex-wrap gap-2">
              {((online as any).users ?? []).length > 0
                ? (online as any).users.map((u: string) => (
                    <span class="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm">{u}</span>
                  ))
                : <span class="text-gray-500 text-sm">No users online</span>
              }
            </div>
          ) : (
            <p class="text-red-400 text-sm">xray API not available</p>
          )}
        </div>
      </Layout>
    );
  })

  .get("/clients", async ({ authorized }) => {
    if (!authorized) return new Response("Unauthorized", { status: 401 });
    const inbounds = await InboundModel.getAll();
    const allClients = (await Promise.all(
      inbounds.map(i => ClientModel.getAllByInbound(i.id))
    )).flat();
    return (
      <Layout title="Clients">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">Clients</h1>
          <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm" onclick="alert('Create form coming soon')">+ Add</button>
        </div>
        <div class="bg-gray-800 rounded-xl overflow-hidden">
          <table class="w-full text-left">
            <thead class="bg-gray-700/50">
              <tr class="text-gray-400 text-sm">
                <th class="p-3">Email</th><th class="p-3">Inbound</th><th class="p-3">Status</th><th class="p-3">Traffic</th><th class="p-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {allClients.map(c => {
                const inbound = inbounds.find(i => i.id === c.inboundId);
                const active = ClientModel.isActive(c);
                return (
                  <tr class="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td class="p-3">{c.email}</td>
                    <td class="p-3">{inbound?.tag ?? c.inboundId}</td>
                    <td class="p-3">
                      <span class={"px-2 py-0.5 rounded text-xs " + (active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300")}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td class="p-3 text-sm">
                      ↓ {(c.totalDownloadUsed / 1024 / 1024).toFixed(1)} MB
                      <br />
                      ↑ {(c.totalUploadUsed / 1024 / 1024).toFixed(1)} MB
                    </td>
                    <td class="p-3 text-sm">
                      {c.expiryTime ? new Date(c.expiryTime * 1000).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Layout>
    );
  });
