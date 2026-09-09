import type  FC  from "@elysiajs/html";
import { Html } from "@elysiajs/html";
interface AuthLayoutProps {
  title: string;
  children: unknown;
}

export const DashLayout: FC<AuthLayoutProps> = ({
  title:string,
  children:any,
}) => {
  return (
    <html lang="ru">
      <head>
        <meta charSet="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <link rel="stylesheet" href="/public/app.css"/>

        <title>{title}</title>
      </head>

      <body class="min-h-screen bg-zinc-100 text-zinc-900">
        {children}
      </body>
    </html>
  );
};
