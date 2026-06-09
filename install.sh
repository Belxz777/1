#!/bin/bash
# install.sh — автоматическая установка bx-panel на VPS
set -e

# ─── Цвета ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
err()  { echo -e "${RED}✗${RESET} $1"; exit 1; }
inf()  { echo -e "${CYAN}ℹ${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET} $1"; }

# ─── Баннер ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════╗"
echo "║    bx-panel — установка на VPS       ║"
echo "╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ─── Проверки ─────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "Запустите скрипт от root: sudo bash install.sh"
[[ ! -f "src/index.ts" ]] && err "Запустите из корня проекта (где есть src/index.ts)"

WORK_DIR=$(pwd)
inf "Рабочая директория: $WORK_DIR"

# ─── 1. Зависимости ───────────────────────────────────────────────────────────
inf "Устанавливаем системные зависимости..."
apt-get update -qq
apt-get install -y --no-install-recommends curl unzip ca-certificates openssl 2>/dev/null || \
  yum install -y curl unzip ca-certificates openssl 2>/dev/null || true
ok "Системные зависимости установлены"

# ─── 2. Bun ───────────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  inf "Устанавливаем Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /etc/profile.d/bun.sh
  ok "Bun установлен: $(bun --version)"
else
  ok "Bun уже установлен: $(bun --version)"
fi

BUN_BIN=$(which bun)

# ─── 3. Xray ──────────────────────────────────────────────────────────────────
XRAY_VERSION=${XRAY_VERSION:-"26.3.27"}
if ! command -v xray &>/dev/null; then
  inf "Устанавливаем Xray v${XRAY_VERSION}..."
  curl -fsSL "https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-linux-64.zip" \
    -o /tmp/xray.zip
  unzip -o /tmp/xray.zip -d /usr/local/bin/ xray
  chmod +x /usr/local/bin/xray
  rm /tmp/xray.zip
  ok "Xray установлен: $(xray version | head -1)"
else
  ok "Xray уже установлен: $(xray version | head -1)"
fi

# ─── 4. Npm зависимости проекта ───────────────────────────────────────────────
inf "Устанавливаем зависимости проекта..."
bun install --frozen-lockfile
ok "Зависимости установлены"

# ─── 5. .env файл ─────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  inf "Создаём .env файл..."

  # Получаем публичный IP
  PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "127.0.0.1")
  # Случайный JWT секрет
  JWT_SECRET=$(openssl rand -hex 32)

  cat > .env << EOF
# bx-panel конфигурация
NODE_ENV=production
SERVER_PORT=3000

# Публичный адрес сервера (домен или IP через sslip.io)
PUBLIC_HOST=${PUBLIC_IP}

# База данных
DATABASE_URL=file:/data/bx-panel.db

# Xray
XRAY_BINARY=/usr/local/bin/xray
XRAY_CONFIG=/etc/xray/config.json
XRAY_API_PORT=10085

# Auth
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${JWT_SECRET}

# Логирование
LOG_LEVEL=info

# TLS (заполните после получения сертификата через: bun run cli.ts)
# TLS_CERT=/etc/letsencrypt/live/your-domain/fullchain.pem
# TLS_KEY=/etc/letsencrypt/live/your-domain/privkey.pem
EOF
  ok ".env создан"
  warn "Отредактируйте .env или используйте: bun run src/cli.ts"
else
  ok ".env уже существует, пропускаем"
fi

# ─── 6. Директории ────────────────────────────────────────────────────────────
mkdir -p /data /etc/xray /var/log
ok "Директории созданы"

# ─── 7. Миграции БД ───────────────────────────────────────────────────────────
inf "Запускаем миграции БД..."
bun run src/database/migrate.ts && ok "Миграции выполнены" || warn "Ошибка миграций (проверьте вручную)"

# ─── 8. CLI утилита ───────────────────────────────────────────────────────────
inf "Устанавливаем CLI команду bx-panel..."
cat > /usr/local/bin/bx-panel << SCRIPT
#!/bin/bash
cd ${WORK_DIR}
exec ${BUN_BIN} run src/cli.ts "\$@"
SCRIPT
chmod +x /usr/local/bin/bx-panel
ok "CLI установлен: bx-panel"

# ─── 9. Systemd сервис ────────────────────────────────────────────────────────
inf "Устанавливаем systemd сервис..."
cat > /etc/systemd/system/bx-panel.service << EOF
[Unit]
Description=bx-panel Xray Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${WORK_DIR}
ExecStart=${BUN_BIN} run src/index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
EnvironmentFile=${WORK_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bx-panel
ok "Systemd сервис установлен и включён"

# ─── 10. Запуск ───────────────────────────────────────────────────────────────
echo
read -p "Запустить панель сейчас? [y/n]: " START
if [[ "$START" =~ ^[Yy]$ ]]; then
  systemctl start bx-panel
  sleep 2
  if systemctl is-active --quiet bx-panel; then
    ok "Панель запущена!"
  else
    err "Ошибка запуска. Проверьте: journalctl -u bx-panel -n 30"
  fi
fi

# ─── Итог ─────────────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "YOUR_IP")
PORT=$(grep SERVER_PORT .env | cut -d= -f2 | tr -d ' ' || echo "3000")

echo
echo -e "${CYAN}${BOLD}══════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  Установка завершена!${RESET}"
echo -e "${CYAN}${BOLD}══════════════════════════════════════${RESET}"
echo
echo -e "  Панель:     ${BOLD}http://${PUBLIC_IP}:${PORT}${RESET}"
echo -e "  CLI:        ${BOLD}bx-panel${RESET}"
echo -e "  Управление: ${BOLD}bx-panel start|stop|restart|status${RESET}"
echo -e "  Настройки:  ${BOLD}bx-panel${RESET} (интерактивное меню)"
echo -e "  Логи:       ${BOLD}journalctl -u bx-panel -f${RESET}"
echo
warn "Следующий шаг — настройте SSL: запустите ${BOLD}bx-panel${RESET} → пункт 5"
echo