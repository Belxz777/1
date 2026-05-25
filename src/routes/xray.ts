import Elysia, { t } from "elysia";
import { getXrayVersion, isXrayRunning, restartXray, validateConfig } from "../services/xray/manage";
import { writeXrayConfig } from "../services/xray/conf";

export const xrayRoutes = new Elysia({
    prefix:'xray'
}
).get('/status',async ()=> {
    return await getXrayVersion();
})
.get('/running',async () => {
    return await isXrayRunning();
})
.get('/restart',async () => {
    return await restartXray()
})
.get('/validate',async ({query}) => {
    const path = query.path as string | undefined;
    if (path && !path.endsWith('.json')){
        return {error:"Config must be json type!"}
    }
    return await validateConfig(path);
})
.post(
    "/config/generate",
    async ({ body }) => {
      const config = await writeXrayConfig(body);
      await restartXray(); // reload xray after writing
      return { success: true, config };
    },
    {
      body: t.Object({
        port: t.Number(),
        protocol: t.Union([t.Literal("vless")]),
        uuid: t.String(),
        tag: t.Optional(t.String()),
      })
    }
  )
  .get("/config/current", async () => {
    const raw = await Bun.file("/etc/xray/config.json").text();
    return JSON.parse(raw);
  });