import html from "@elysiajs/html";
import Elysia from "elysia";
import page from '@/pages/index.html'
export const pages = new Elysia (
    {
        prefix:"panel"
    }
).use(html())
.get('/', () => {

   return Bun.file('src/pages/index.html')
})
