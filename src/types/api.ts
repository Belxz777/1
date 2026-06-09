export interface SystemStats {
  success: boolean;
  cpu: {
    cores: number;
    model: string;
    load: Array<{
      model: string;
      speed: number;
      usage: {
        user: number;
        nice: number;
        sys: number;
        idle: number;
        irq: number;
      };
      total: number;
    }>;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  system: {
    platform: string;
    arch: string;
    uptime: number;
    hostname: string;
  };
  loadavg: [number, number, number];
}

export interface Client {
  id: string;
  inboundId: number;
  email: string;
  enabled: boolean;
  totalUploadLimit: number;
  totalDownloadLimit: number;
  totalUploadUsed: number;
  totalDownloadUsed: number;
  expiryTime: number;
  createdAt: string;
}

export interface Inbound {
  id: number;
  tag: string;
  protocol: string;
  port: number;
  listen: string;
  enabled: boolean;
  settings: string;
  streamSettings: string;
  sniffingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineUser {
  email: string;
  protocol: string;
  inbound: string;
  traffic: {
    upload: number;
    download: number;
  };
}