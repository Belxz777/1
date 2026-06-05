import Elysia, { t } from "elysia";
import os from "os";

export const systemData = new Elysia({ prefix: "/system" })
  .get(
    "/all",
    ({ query }) => {
        const html = query.type && "html";
      const unit = query.unit ?? "bytes";

      const cpus = os.cpus();

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const cpuLoad = cpus.map((cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);

        return {
          model: cpu.model,
          speed: cpu.speed,
          usage: cpu.times,
          total,
        };
      });
      if(html){
 const memPct = ((usedMem / totalMem) * 100).toFixed(2);
const [l1, l5, l15] = os.loadavg().map(v => v.toFixed(2));

return `
<p class="sm-section">оперативка</p>
<div class="sm-grid">
  <div class="sm-card">
    <div class="lbl">used</div>
    <div class="val">${memPct}%</div>
    <div class="sub">${formatBytes(usedMem, unit)} / ${formatBytes(totalMem, unit)} ${unit}</div>
    <div class="bar"><div class="bar-f" style="width:${memPct}%"></div></div>
  </div>
  <div class="sm-card">
    <div class="lbl">free</div>
    <div class="val">${formatBytes(freeMem, unit)} ${unit}</div>
  </div>
</div>

<p class="sm-section">cpu</p>
<div class="sm-info">
  <table>
    <tr><td>model</td><td>${cpus[0]?.model}</td></tr>
    <tr><td>cores</td><td>${cpus.length}</td></tr>
    <tr><td>speed</td><td>${cpus[0]?.speed} MHz</td></tr>
  </table>
</div>

<p class="sm-section">system</p>
<div class="sm-info">
  <table>
    <tr><td>os</td><td>${os.platform()}</td></tr>
    <tr><td>arch</td><td>${os.arch()}</td></tr>
    <tr>
  <td>uptime</td>
  <td>
    ${Math.floor(os.uptime() / 86400)}d 
    ${Math.floor((os.uptime() % 86400) / 3600)}h 
    ${Math.floor((os.uptime() % 3600) / 60)}m 
    ${Math.floor(os.uptime() % 60)}s
  </td>
</tr>

    </table>
</div>

<p class="sm-section">load avg</p>
<div class="load-dots">
  <div class="load-dot"><div class="lv">${l1}</div><div class="lt">1 min</div></div>
  <div class="load-dot"><div class="lv">${l5}</div><div class="lt">5 min</div></div>
  <div class="load-dot"><div class="lv">${l15}</div><div class="lt">15 min</div></div>
</div>
`;
      }
      return {
        success: true,

        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model,
          load: cpuLoad,
        },

        memory: {
          total: formatBytes(totalMem, unit),
          free: formatBytes(freeMem, unit),
          used: formatBytes(usedMem, unit),
          usagePercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
        },

        system: {
          platform: os.platform(),
          arch: os.arch(),
          uptime: os.uptime(),
          hostname: os.hostname(),
        },

        loadavg: os.loadavg(),
      };
    },
    {
      query: t.Object({
        type:t.Any(),
        unit: t.Optional(
          t.Union([
            t.Literal("bytes"),
            t.Literal("kb"),
            t.Literal("mb"),
            t.Literal("gb"),
          ])
        ),
      }),
    }
  );

// ─── helpers ─────────────────────────────

function formatBytes(bytes: number, unit: string) {
  switch (unit) {
    case "kb":
      return bytes / 1024;

    case "mb":
      return bytes / 1024 / 1024;

    case "gb":
      return bytes / 1024 / 1024 / 1024;

    default:
      return bytes;
  }
}