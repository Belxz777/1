FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM debian:12-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

ARG XRAY_VERSION=26.3.27
RUN curl -fsSL https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-linux-64.zip \
    -o /tmp/xray.zip \
    && unzip /tmp/xray.zip -d /usr/local/bin/ \
    && rm /tmp/xray.zip \
    && chmod +x /usr/local/bin/xray
RUN mkdir -p /usr/share/xray /etc/xray /data /app

COPY --from=build /app /app
WORKDIR /app
RUN bun install --frozen-lockfile

EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
