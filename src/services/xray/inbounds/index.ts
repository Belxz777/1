import type { ConfigOptions } from "../conf";

export function buildInbounds(opts: ConfigOptions) {
  return [
    {
      tag: opts.tag ?? "inbound-main",
      port: opts.port,
      protocol: opts.protocol,
      settings: {
        clients: [{ id: opts.uuid }]
      },
      streamSettings: {
        network: "tcp"
      }
    }
  ];
}