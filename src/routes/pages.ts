import html from "@elysiajs/html";
import Elysia from "elysia";

export const pages = new Elysia (
    {
        prefix:"panel"
    }
).use(html())
.get('/', () => {
   return Bun.file('./pages/index.htm').text()
})
.get('/dash',()=>{
    return Bun.file('').text()
})