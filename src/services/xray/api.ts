import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";
import { env } from "../../config";

const PROTO_DIR = join(import.meta.dir, "../../../proto");
const STATS_PROTO = join(PROTO_DIR, "stats.proto");

let client: ReturnType<typeof createClient> | null = null;

function createClient() {
  const pkgDef = protoLoader.loadSync(STATS_PROTO, {
    keepCase: true,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });

  const proto = grpc.loadPackageDefinition(pkgDef) as any;
  const stats = proto.xray.app.stats.command;

  const creds = grpc.credentials.createInsecure();
  const c = new stats.StatsService(env.xray.apiAddress, creds);

  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 5);

  return { client: c, proto, stats };
}

function getClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

function promisify<T>(fn: (req: any, callback: (err: any, res: T) => void) => void, req: any): Promise<T> {
  return new Promise((resolve, reject) => {
    fn.call(getClient().client, req, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

export async function getStat(name: string, reset = false) {
  try {
    const res = await promisify<{ stat: { name: string; value: number } }>(
      getClient().client.GetStats.bind(getClient().client),
      { name, reset }
    );
    return { success: true, name: res.stat.name, value: res.stat.value };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function queryStats(pattern: string, reset = false) {
  try {
    const res = await promisify<{ stat: Array<{ name: string; value: number }> }>(
      getClient().client.QueryStats.bind(getClient().client),
      { pattern, reset }
    );
    return { success: true, stats: res.stat };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function getSysStats() {
  try {
    const res = await promisify<{
      NumGoroutine: number;
      NumGC: number;
      Alloc: number;
      TotalAlloc: number;
      Sys: number;
      Mallocs: number;
      Frees: number;
      LiveObjects: number;
      PauseTotalNs: number;
      Uptime: number;
    }>(getClient().client.GetSysStats.bind(getClient().client), {});
    return { success: true, ...res };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function getAllOnlineUsers() {
  try {
    const res = await promisify<{ users: string[] }>(
      getClient().client.GetAllOnlineUsers.bind(getClient().client),
      {}
    );
    return { success: true, users: res.users };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function getUserStats(includeTraffic = true, reset = false) {
  try {
    const res = await promisify<{
      users: Array<{
        email: string;
        ips: Array<{ ip: string; last_seen: number }>;
        traffic?: { uplink: number; downlink: number };
      }>;
    }>(
      getClient().client.GetUsersStats.bind(getClient().client),
      { include_traffic: includeTraffic, reset }
    );
    return { success: true, users: res.users };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}
