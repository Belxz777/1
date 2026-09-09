import { Html } from "@elysiajs/html";
import { formatBytes } from "@/utils/format";
import type { Client } from "@/types/api";

type ClientRow = Client & { inboundTag?: string };

export const ClientTable = ({
  clients,
  showInboundColumn = false,
}: {
  clients: ClientRow[];
  showInboundColumn?: boolean;
}) => (
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Email</th>
          {showInboundColumn ? <th>Inbound</th> : null}
          <th>Трафик ↓ / ↑</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr id={`client-row-${c.id}`}>
            <td>
              <strong>{c.email}</strong>
            </td>
            {showInboundColumn ? (
              <td>
                <span class="muted-text">{c.inboundTag ?? "—"}</span>
              </td>
            ) : null}
            <td>
              {formatBytes(c.totalDownloadUsed ?? 0)}{" "}
              <span class="muted-text">/ {formatBytes(c.totalUploadUsed ?? 0)}</span>
            </td>
            <td>
              <button
                hx-patch={`/xray/clients/${c.id}/toggle`}
                hx-vals={JSON.stringify({ enabled: !c.enabled })}
                hx-target={`#client-row-${c.id}`}
                hx-swap="outerHTML swap:0.2s"
                class={`status-pill status-pill--${c.enabled ? "green" : "gray"}`}
              >
                <span />
                {c.enabled ? "Активен" : "Отключен"}
              </button>
            </td>
            <td class="row-actions">
              <button
                hx-delete={`/xray/clients/${c.id}`}
                hx-confirm="Удалить клиента?"
                hx-target={`#client-row-${c.id}`}
                hx-swap="outerHTML swap:0.2s"
                class="text-button text-button--danger"
              >
                Удалить
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
