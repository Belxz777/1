import html from "@elysiajs/html";
import Elysia from "elysia";

export const pages = new Elysia (
    {
        prefix:"pages"
    }
).use(html())
.get('/pg', () => {
   return Bun.file('./pages/xray_post_tester.html').text()
})