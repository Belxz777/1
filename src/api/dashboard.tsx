import { LoginPage } from "@/pages/auth/LoginPage";
import Elysia from "elysia";
 export const dashboard = new Elysia(
    {
        prefix:"/dashboard"
    }
 )
 .get("/",
 () => {
    
 }
 )

