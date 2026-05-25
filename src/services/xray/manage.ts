import { $ } from "bun";
import { env } from "../../config";

export async function getXrayVersion() {
  try {
    const result = await $`xray version`.text();

    return {
      installed: true,
      output: result,
    };
  } catch {
    return {
      installed: false,
      output: null,
    };
  }
}
export async function isXrayRunning(){
    try{
        const result = await $`pgrep xray`.text();
        return {
            isRunning:result.trim().length > 0,
            processId:result.trim()
        } 
    } 
    catch{
        return {
            isRunning:false,
            processId:null
        }
    }
}
export async function restartXray(){
  try{
    await $`systemctl restart xray`
    return {
      success:true
    }
  }
  catch(e){
    return {
      success:false,
      error:String(e)
    }
  }
}

export async function validateConfig(path?: string ) {
  const configPath =  path || env.xray.configPath;
  if (!configPath){
    return {valid:false,error:"Xray config path is not set"}
  }
  try {
    const result =
      await $`xray run -test -config  ${configPath}`.text();

    return {
      valid: true,
      output: result,
    };
  } catch (e) {
    console.log("")
    return {
      valid: false,
      error: String(e),
    };
  }
}

