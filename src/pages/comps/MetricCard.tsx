import { Html } from "@elysiajs/html";

export const MetricCard = ({
  label,
  value,
  detail,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "purple" | "orange";
}) => (
  <article class="metric-card">
    <div class={`metric-marker metric-marker--${tone}`} aria-hidden="true" />
    <p class="eyebrow">{label}</p>
    <p class="metric-value">{value}</p>
    <p class="metric-detail">{detail}</p>
  </article>
);