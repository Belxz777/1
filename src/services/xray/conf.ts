import { env } from "../../config";
import { xrayConfigTemplate } from "./conf.template";
import { buildInbounds } from "./inbounds";

export interface ConfigOptions {
    port:number,
    protocol: "vless" | "vmess",
    uuid:string,
    tag?:string;
}
export function generateXrayConfig(options:ConfigOptions){
    const inbounds = buildInbounds(options);
    return {
        ...xrayConfigTemplate,
        inbounds
    }    
}
export async function writeXrayConfig(options: ConfigOptions, path?:string) {
  const confPath = path || env.xray.configPath;
  const config = generateXrayConfig(options);
  await Bun.write(confPath, JSON.stringify(config, null, 2));
  return config;
}