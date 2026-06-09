import { db } from "@/database";
import { restartXray } from "./manage";
import { writeXrayConfig } from "./conf";

export async function syncXray() {
    try {
        await writeXrayConfig();

        await restartXray();
        
        return  {
            success:true,
            message:"Синхронизированно db -> xray"
        }
    }
    catch(error){
        console.error("Xray sync failed:", error);

        return {
        success: false,
        error,
        };
    }
}