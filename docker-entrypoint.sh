#!/bin/bash
set -e

echo "=== Starting bx-panel-xray ==="

mkdir -p /data /etc/xray /usr/share/xray

# Проверяем, что xray установлен
if ! command -v xray &>/dev/null; then
  echo "ERROR: xray not found"
  exit 1
fi

# Создаём базовый конфиг xray, если его нет
if [ ! -f "$XRAY_CONFIG" ]; then
  echo "Creating default xray config..."
  mkdir -p "$(dirname "$XRAY_CONFIG")"
  cat > "$XRAY_CONFIG" << 'EOF'
{
  "log": { "loglevel": "info" },
  "api": {
    "tag": "api",
    "services": ["HandlerService", "StatsService", "ReflectionService"]
  },
  "policy": {
    "levels": { "0": { "statsUserUplink": true, "statsUserDownlink": true } },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true,
      "statsOutboundUplink": true,
      "statsOutboundDownlink": true
    }
  },
  "stats": {},
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 10085,
      "protocol": "dokodemo-door",
      "settings": { "address": "127.0.0.1" },
      "tag": "api"
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "block" }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      { "type": "field", "inboundTag": ["api"], "outboundTag": "api" }
    ]
  }
}
EOF
fi

# Запускаем xray в фоне
echo "Starting xray..."
xray -config "$XRAY_CONFIG" &
XRAY_PID=$!
sleep 1

# Проверяем xray
if ! kill -0 $XRAY_PID 2>/dev/null; then
  echo "ERROR: xray failed to start"
  exit 1
fi
echo "xray running (PID: $XRAY_PID)"

# Запускаем панель
echo "Starting panel..."
exec bun run src/index.ts
