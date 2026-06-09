#!/usr/bin/env bun
/**
 * bx-panel CLI — интерактивное меню управления панелью
 * Запуск: bun run cli.ts  или  bx-panel (после установки)
 */

import { execSync, spawn } from "child_process";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// ─── Цвета ───────────────────────────────────────────────────────────────────

const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  blue:   "\x1b[34m",
  cyan:   "\x1b[36m",
  white:  "\x1b[37m",
};

const ok  = (s: string) => console.log(`${c.green}✓${c.reset} ${s}`);
const err = (s: string) => console.log(`${c.red}✗${c.reset} ${s}`);
const inf = (s: string) => console.log(`${c.cyan}ℹ${c.reset} ${s}`);
const warn= (s: string) => console.log(`${c.yellow}⚠${c.reset} ${s}`);

// ─── Readline helper ─────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function askSecret(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    let input = "";
    const onData = (ch: Buffer) => {
      const char = ch.toString();
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "\u0003") {
        process.exit();
      } else if (char === "\u007f") {
        if (input.length > 0) { input = input.slice(0, -1); process.stdout.write("\b \b"); }
      } else {
        input += char;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function run(cmd: string, silent = false): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
  } catch (e: any) {
    return e.message ?? "";
  }
}

function runSilent(cmd: string): string {
  return run(cmd, true);
}

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function printBanner() {
  console.log(`${c.cyan}${c.bold}
╔══════════════════════════════════════╗
║         bx-panel  CLI  v0.1          ║
║     Xray Panel Management Tool       ║
╚══════════════════════════════════════╝${c.reset}`);
}

function isRoot(): boolean {
  return process.getuid?.() === 0;
}

function requireRoot() {
  if (!isRoot()) {
    err("Требуются права root. Запустите через sudo.");
    process.exit(1);
  }
}

// ─── Env файл ────────────────────────────────────────────────────────────────

const ENV_PATH = path.join(process.cwd(), ".env");

function readEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  const result: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return result;
}

function writeEnv(data: Record<string, string>) {
  const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

function setEnvKey(key: string, value: string) {
  const env = readEnv();
  env[key] = value;
  writeEnv(env);
}

// ─── Системный статус ─────────────────────────────────────────────────────────

async function showStatus() {
  clearScreen();
  printBanner();
  console.log(`\n${c.bold}[ Системный статус ]${c.reset}\n`);

  // Панель
  const panelPid = runSilent("pgrep -f 'bun run src/index.ts'").trim();
  if (panelPid) ok(`Панель запущена (PID: ${panelPid})`);
  else err("Панель не запущена");

  // Xray
  const xrayPid = runSilent("pgrep xray").trim();
  if (xrayPid) ok(`Xray запущен (PID: ${xrayPid})`);
  else err("Xray не запущен");

  // Xray версия
  const xrayVer = runSilent("xray version 2>/dev/null | head -1").trim();
  if (xrayVer) inf(`Xray: ${xrayVer}`);

  // Bun версия
  const bunVer = runSilent("bun --version").trim();
  inf(`Bun: v${bunVer}`);

  // Порт панели
  const env = readEnv();
  const port = env.SERVER_PORT ?? env.PORT ?? "3000";
  inf(`Панель слушает на порту: ${port}`);

  // Публичный хост
  const host = env.PUBLIC_HOST ?? "не задан";
  inf(`Публичный хост: ${host}`);

  // SSL
  const cert = env.TLS_CERT;
  if (cert && fs.existsSync(cert)) {
    const certInfo = runSilent(`openssl x509 -enddate -noout -in "${cert}" 2>/dev/null`).trim();
    ok(`SSL сертификат: ${certInfo}`);
  } else {
    warn("SSL сертификат не настроен");
  }

  console.log();
  await ask("Нажмите Enter для продолжения...");
}

// ─── Управление панелью ───────────────────────────────────────────────────────

async function panelMenu() {
  while (true) {
    clearScreen();
    printBanner();
    console.log(`\n${c.bold}[ Управление панелью ]${c.reset}\n`);
    console.log("  1. Запустить панель");
    console.log("  2. Остановить панель");
    console.log("  3. Перезапустить панель");
    console.log("  4. Показать логи (последние 50 строк)");
    console.log(`  ${c.dim}0. Назад${c.reset}`);
    console.log();

    const choice = await ask("Выберите действие: ");

    switch (choice.trim()) {
      case "1":
        inf("Запуск панели...");
        run("systemctl start bx-panel 2>/dev/null || (nohup bun run src/index.ts > /var/log/bx-panel.log 2>&1 &)");
        ok("Готово");
        await ask("Enter для продолжения...");
        break;

      case "2":
        inf("Остановка панели...");
        run("systemctl stop bx-panel 2>/dev/null || pkill -f 'bun run src/index.ts'");
        ok("Готово");
        await ask("Enter для продолжения...");
        break;

      case "3":
        inf("Перезапуск панели...");
        run("systemctl restart bx-panel 2>/dev/null || (pkill -f 'bun run src/index.ts'; sleep 1; nohup bun run src/index.ts > /var/log/bx-panel.log 2>&1 &)");
        ok("Готово");
        await ask("Enter для продолжения...");
        break;

      case "4":
        run("tail -50 /var/log/bx-panel.log 2>/dev/null || journalctl -u bx-panel -n 50 --no-pager 2>/dev/null || echo 'Логи не найдены'");
        await ask("Enter для продолжения...");
        break;

      case "0":
        return;
    }
  }
}

// ─── Управление Xray ─────────────────────────────────────────────────────────

async function xrayMenu() {
  while (true) {
    clearScreen();
    printBanner();
    console.log(`\n${c.bold}[ Управление Xray ]${c.reset}\n`);
    console.log("  1. Запустить Xray");
    console.log("  2. Остановить Xray");
    console.log("  3. Перезапустить Xray");
    console.log("  4. Показать статус");
    console.log("  5. Показать версию");
    console.log("  6. Показать логи Xray");
    console.log(`  ${c.dim}0. Назад${c.reset}`);
    console.log();

    const choice = await ask("Выберите действие: ");

    switch (choice.trim()) {
      case "1":
        run("systemctl start xray 2>/dev/null || xray -config /etc/xray/config.json &");
        ok("Xray запущен");
        await ask("Enter...");
        break;
      case "2":
        run("systemctl stop xray 2>/dev/null || pkill xray");
        ok("Xray остановлен");
        await ask("Enter...");
        break;
      case "3":
        run("systemctl restart xray 2>/dev/null || (pkill xray; sleep 1; xray -config /etc/xray/config.json &)");
        ok("Xray перезапущен");
        await ask("Enter...");
        break;
      case "4":
        run("systemctl status xray 2>/dev/null || (pgrep xray && echo 'xray running' || echo 'xray not running')");
        await ask("Enter...");
        break;
      case "5":
        run("xray version");
        await ask("Enter...");
        break;
      case "6":
        run("journalctl -u xray -n 50 --no-pager 2>/dev/null || tail -50 /var/log/xray/access.log 2>/dev/null || echo 'Логи не найдены'");
        await ask("Enter...");
        break;
      case "0":
        return;
    }
  }
}

// ─── Настройки панели ─────────────────────────────────────────────────────────

async function settingsMenu() {
  while (true) {
    clearScreen();
    printBanner();
    const env = readEnv();
    console.log(`\n${c.bold}[ Настройки панели ]${c.reset}\n`);
    console.log(`  Текущие значения:`);
    console.log(`  ${c.dim}PUBLIC_HOST${c.reset}  = ${env.PUBLIC_HOST ?? c.yellow + "не задан" + c.reset}`);
    console.log(`  ${c.dim}SERVER_PORT${c.reset}  = ${env.SERVER_PORT ?? env.PORT ?? "3000"}`);
    console.log(`  ${c.dim}TLS_CERT${c.reset}     = ${env.TLS_CERT ?? c.yellow + "не задан" + c.reset}`);
    console.log(`  ${c.dim}TLS_KEY${c.reset}      = ${env.TLS_KEY ?? c.yellow + "не задан" + c.reset}`);
    console.log();
    console.log("  1. Изменить PUBLIC_HOST");
    console.log("  2. Изменить порт панели");
    console.log("  3. Изменить пути SSL сертификатов");
    console.log("  4. Изменить секрет сессии (JWT_SECRET)");
    console.log("  5. Показать весь .env");
    console.log(`  ${c.dim}0. Назад${c.reset}`);
    console.log();

    const choice = await ask("Выберите действие: ");

    switch (choice.trim()) {
      case "1": {
        const val = await ask(`Новый PUBLIC_HOST (текущий: ${env.PUBLIC_HOST ?? ""}): `);
        if (val.trim()) { setEnvKey("PUBLIC_HOST", val.trim()); ok("Сохранено"); }
        break;
      }
      case "2": {
        const val = await ask(`Новый порт (текущий: ${env.SERVER_PORT ?? "3000"}): `);
        if (val.trim()) { setEnvKey("SERVER_PORT", val.trim()); ok("Сохранено"); }
        break;
      }
      case "3": {
        const cert = await ask("Путь к fullchain.pem: ");
        const key  = await ask("Путь к privkey.pem: ");
        if (cert.trim()) setEnvKey("TLS_CERT", cert.trim());
        if (key.trim())  setEnvKey("TLS_KEY",  key.trim());
        ok("Сохранено");
        break;
      }
      case "4": {
        const secret = await askSecret("Новый JWT_SECRET: ");
        if (secret.trim()) { setEnvKey("JWT_SECRET", secret.trim()); ok("Сохранено"); }
        break;
      }
      case "5":
        console.log("\n" + (fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "Файл .env не найден"));
        await ask("Enter...");
        break;
      case "0":
        return;
    }
  }
}

// ─── SSL-сертификат ───────────────────────────────────────────────────────────

async function sslMenu() {
  while (true) {
    clearScreen();
    printBanner();
    console.log(`\n${c.bold}[ SSL Сертификаты ]${c.reset}\n`);
    console.log("  1. Получить сертификат для домена (Let's Encrypt)");
    console.log("  2. Получить сертификат для IP (через sslip.io)");
    console.log("  3. Самоподписанный сертификат");
    console.log("  4. Указать существующие пути к сертификатам");
    console.log("  5. Проверить текущий сертификат");
    console.log(`  ${c.dim}0. Назад${c.reset}`);
    console.log();

    const choice = await ask("Выберите действие: ");

    switch (choice.trim()) {
      case "1": {
        requireRoot();
        const domain = await ask("Введите домен (например: example.com): ");
        if (!domain.trim()) break;

        inf("Устанавливаем certbot...");
        run("apt-get install -y certbot 2>/dev/null || yum install -y certbot 2>/dev/null");

        inf(`Получаем сертификат для ${domain}...`);
        const result = runSilent(
          `certbot certonly --standalone --agree-tos --register-unsafely-without-email -d ${domain} 2>&1`
        );

        if (result.includes("Congratulations") || result.includes("Certificate not yet due")) {
          const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
          const keyPath  = `/etc/letsencrypt/live/${domain}/privkey.pem`;
          setEnvKey("TLS_CERT", certPath);
          setEnvKey("TLS_KEY",  keyPath);
          setEnvKey("PUBLIC_HOST", domain);
          ok(`Сертификат получен!`);
          ok(`PUBLIC_HOST установлен: ${domain}`);
          inf("Для авторенью добавьте в cron: 0 0 */80 * * certbot renew --quiet");
        } else {
          err("Не удалось получить сертификат");
          console.log(result);
        }
        await ask("Enter...");
        break;
      }

      case "2": {
        requireRoot();
        inf("Определяем публичный IP...");
        const ip = runSilent("curl -s https://api.ipify.org").trim();
        if (!ip) { err("Не удалось определить IP"); await ask("Enter..."); break; }
        inf(`Ваш IP: ${ip}`);

        // Конвертируем IP в домен sslip.io: 1.2.3.4 -> 1-2-3-4.sslip.io
        const sslipDomain = ip.replace(/\./g, "-") + ".sslip.io";
        inf(`Домен sslip.io: ${sslipDomain}`);

        const confirm = await ask(`Получить сертификат для ${sslipDomain}? [y/n]: `);
        if (confirm.toLowerCase() !== "y") break;

        run("apt-get install -y certbot 2>/dev/null || yum install -y certbot 2>/dev/null");

        const result = runSilent(
          `certbot certonly --standalone --agree-tos --register-unsafely-without-email -d ${sslipDomain} 2>&1`
        );

        if (result.includes("Congratulations") || result.includes("Certificate not yet due")) {
          const certPath = `/etc/letsencrypt/live/${sslipDomain}/fullchain.pem`;
          const keyPath  = `/etc/letsencrypt/live/${sslipDomain}/privkey.pem`;
          setEnvKey("TLS_CERT", certPath);
          setEnvKey("TLS_KEY",  keyPath);
          setEnvKey("PUBLIC_HOST", sslipDomain);
          ok(`Сертификат получен!`);
          ok(`PUBLIC_HOST установлен: ${sslipDomain}`);
          warn("Сертификат sslip.io действует 90 дней. Авторенью:");
          inf("0 0 */80 * * certbot renew --quiet");
        } else {
          err("Не удалось получить сертификат");
          console.log(result);
        }
        await ask("Enter...");
        break;
      }

      case "3": {
        requireRoot();
        const outDir = "/etc/bx-panel/ssl";
        run(`mkdir -p ${outDir}`);
        const ip = runSilent("curl -s https://api.ipify.org").trim() || "127.0.0.1";
        inf(`Генерируем самоподписанный сертификат для IP: ${ip}`);
        run(
          `openssl req -x509 -newkey rsa:4096 -keyout ${outDir}/key.pem -out ${outDir}/cert.pem ` +
          `-days 365 -nodes -subj "/CN=${ip}" 2>/dev/null`
        );
        setEnvKey("TLS_CERT", `${outDir}/cert.pem`);
        setEnvKey("TLS_KEY",  `${outDir}/key.pem`);
        ok("Самоподписанный сертификат создан");
        warn("Клиенты будут показывать предупреждение безопасности");
        await ask("Enter...");
        break;
      }

      case "4": {
        const cert = await ask("Полный путь к cert/fullchain.pem: ");
        const key  = await ask("Полный путь к key/privkey.pem: ");
        if (cert.trim() && fs.existsSync(cert.trim())) {
          setEnvKey("TLS_CERT", cert.trim());
          ok("TLS_CERT сохранён");
        } else if (cert.trim()) {
          err(`Файл не найден: ${cert}`);
        }
        if (key.trim() && fs.existsSync(key.trim())) {
          setEnvKey("TLS_KEY", key.trim());
          ok("TLS_KEY сохранён");
        } else if (key.trim()) {
          err(`Файл не найден: ${key}`);
        }
        await ask("Enter...");
        break;
      }

      case "5": {
        const env = readEnv();
        const cert = env.TLS_CERT;
        if (!cert || !fs.existsSync(cert)) {
          warn("Сертификат не настроен или файл не найден");
        } else {
          run(`openssl x509 -in "${cert}" -noout -subject -issuer -dates 2>/dev/null`);
        }
        await ask("Enter...");
        break;
      }

      case "0":
        return;
    }
  }
}

// ─── Установка systemd сервиса ────────────────────────────────────────────────

async function installService() {
  requireRoot();
  clearScreen();
  printBanner();
  console.log(`\n${c.bold}[ Установка как systemd сервис ]${c.reset}\n`);

  const workDir = process.cwd();
  const bunBin  = runSilent("which bun").trim() || "/root/.bun/bin/bun";

  const serviceContent = `[Unit]
Description=bx-panel Xray Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${workDir}
ExecStart=${bunBin} run src/index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
EnvironmentFile=${workDir}/.env

[Install]
WantedBy=multi-user.target
`;

  fs.writeFileSync("/etc/systemd/system/bx-panel.service", serviceContent);
  run("systemctl daemon-reload");
  run("systemctl enable bx-panel");

  ok("Сервис установлен: bx-panel.service");
  inf("Команды управления:");
  console.log("  systemctl start bx-panel");
  console.log("  systemctl stop bx-panel");
  console.log("  systemctl status bx-panel");
  console.log("  journalctl -u bx-panel -f");

  const start = await ask("\nЗапустить сервис сейчас? [y/n]: ");
  if (start.toLowerCase() === "y") {
    run("systemctl start bx-panel");
    ok("Сервис запущен");
  }

  await ask("Enter для продолжения...");
}

// ─── Миграции БД ─────────────────────────────────────────────────────────────

async function runMigrations() {
  clearScreen();
  printBanner();
  inf("Запуск миграций базы данных...");
  run("bun run src/database/migrate.ts");
  await ask("Enter для продолжения...");
}

// ─── Главное меню ─────────────────────────────────────────────────────────────

async function mainMenu() {
  while (true) {
    clearScreen();
    printBanner();
    console.log(`\n${c.bold}Главное меню${c.reset}\n`);
    console.log("  1. Статус системы");
    console.log("  2. Управление панелью");
    console.log("  3. Управление Xray");
    console.log("  4. Настройки (.env)");
    console.log("  5. SSL сертификаты");
    console.log("  6. Установить как systemd сервис");
    console.log("  7. Запустить миграции БД");
    console.log(`  ${c.red}0. Выход${c.reset}`);
    console.log();

    const choice = await ask("Выберите пункт: ");

    switch (choice.trim()) {
      case "1": await showStatus();       break;
      case "2": await panelMenu();        break;
      case "3": await xrayMenu();         break;
      case "4": await settingsMenu();     break;
      case "5": await sslMenu();          break;
      case "6": await installService();   break;
      case "7": await runMigrations();    break;
      case "0":
        rl.close();
        console.log(`\n${c.cyan}До свидания!${c.reset}\n`);
        process.exit(0);
      default:
        warn("Неверный выбор");
        await Bun.sleep(600);
    }
  }
}

// ─── CLI аргументы (неинтерактивный режим) ────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0) {
  // bx-panel start | stop | restart | status | migrate
  switch (args[0]) {
    case "start":
      run("systemctl start bx-panel 2>/dev/null || (nohup bun run src/index.ts > /var/log/bx-panel.log 2>&1 &)");
      ok("Панель запущена"); break;
    case "stop":
      run("systemctl stop bx-panel 2>/dev/null || pkill -f 'bun run src/index.ts'");
      ok("Панель остановлена"); break;
    case "restart":
      run("systemctl restart bx-panel 2>/dev/null || (pkill -f 'bun run src/index.ts'; sleep 1; nohup bun run src/index.ts > /var/log/bx-panel.log 2>&1 &)");
      ok("Панель перезапущена"); break;
    case "status":
      run("systemctl status bx-panel 2>/dev/null || (pgrep -f 'bun run src/index.ts' && echo 'running' || echo 'stopped')");
      break;
    case "migrate":
      run("bun run src/database/migrate.ts"); break;
    default:
      err(`Неизвестная команда: ${args[0]}`);
      console.log("Доступные команды: start | stop | restart | status | migrate");
  }
  process.exit(0);
}

// ─── Запуск интерактивного меню ───────────────────────────────────────────────

await mainMenu();