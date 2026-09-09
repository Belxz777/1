import { Html } from "@elysiajs/html";
import { formatBytes } from "@/utils/format";
import type { Client } from "@/types/api";

type InboundRow = {
  id: number;
  tag: string;
  protocol: string;
  port: number;
  enabled: boolean;
  clients: Client[];
};

export const InboundTable = ({ inbounds }: { inbounds: InboundRow[] }) => (
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Tag</th>
          <th>Протокол</th>
          <th>Порт</th>
          <th>Клиенты</th>
          <th>Трафик</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        {inbounds.map((ib) => {
          const traffic = ib.clients.reduce(
            (sum, c) => sum + (c.totalUploadUsed ?? 0) + (c.totalDownloadUsed ?? 0),
            0
          );
          return (
            <tr id={`inbound-row-${ib.id}`}>
              <td>
                <strong>{ib.tag}</strong>
              </td>
              <td>
                <span class="protocol-chip">{ib.protocol}</span>
              </td>
              <td>{ib.port}</td>
              <td>{ib.clients.length}</td>
              <td>{formatBytes(traffic)}</td>
              <td>
                <span class={`status-pill status-pill--${ib.enabled ? "green" : "gray"}`}>
                  <span />
                  {ib.enabled ? "Активен" : "Остановлен"}
                </span>
              </td>
              <td class="row-actions">
                <a href={`/dashboard/inbounds/${ib.id}/clients`} class="text-button">
                  Клиенты
                </a>
                <button
                  hx-delete={`/xray/inbounds/${ib.id}`}
                  hx-confirm="Удалить inbound вместе со всеми клиентами?"
                  hx-target={`#inbound-row-${ib.id}`}
                  hx-swap="outerHTML swap:0.2s"
                  class="text-button text-button--danger"
                >
                  Удалить
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);