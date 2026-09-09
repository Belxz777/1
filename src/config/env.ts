// src/config/env.ts

import { EnvSchema, validateEnv } from "./validate";

// Валидируем переменные при загрузке
const validatedEnv = validateEnv();

// Конфигурация приложения
export const env = {
  // Сервер
  server: {
    port: validatedEnv.PORT,
    env: validatedEnv.NODE_ENV,
    isDevelopment: validatedEnv.NODE_ENV === 'development',
    isProduction: validatedEnv.NODE_ENV === 'production',
    isTest: validatedEnv.NODE_ENV === 'test',
  },
  db:{
    path: validatedEnv.DB_PATH
  },
  // Логирование
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },
  
  // XRay
  xray: {
    binary: validatedEnv.XRAY_BINARY,
    configPath: validatedEnv.XRAY_CONFIG,
    assetsPath: validatedEnv.XRAY_LOCATION_ASSET || '/usr/share/xray',
    apiAddress: validatedEnv.XRAY_API_ADDRESS,
  },
  
  // JWT
  auth: {
    jwtSecret: validatedEnv.AUTH_JWT_SECRET,
    adminPassword: validatedEnv.ADMIN_PASSWORD_KEY,
  },

  // Публичный адрес для share-ссылок
  publicHost: validatedEnv.SERVER_PUBLIC_HOST,

  // Другие настройки
  mode: validatedEnv.MODE,
};

// Типизированный экспорт (безопасный доступ)
export type Config = typeof env;

// Хелпер для проверки переменных
export function requireEnv(key: keyof EnvSchema): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}