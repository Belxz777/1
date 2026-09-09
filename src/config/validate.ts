// src/config/validation.ts
import { z } from 'zod';

// Определение схемы для переменных окружения
export const envSchema = z.object({
  // Сервер
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // XRay конфигурация
  XRAY_BINARY: z.string().default("xray"),
  XRAY_CONFIG: z.string().default("/etc/xray/config.json"),
  XRAY_LOCATION_ASSET: z.string().default("/usr/share/xray"),
  
  // XRay API (gRPC)
  XRAY_API_ADDRESS: z.string().default("127.0.0.1:10085"),

  // Публичный адрес сервера для ссылок-подписок
  SERVER_PUBLIC_HOST: z.string().default("127.0.0.1"),

  // JWT аутентификация
  AUTH_JWT_SECRET: z.string().min(16, "AUTH_JWT_SECRET must be at least 16 characters").default("changeme-secret-key-min-16-chars"),
  ADMIN_PASSWORD_KEY: z.string().default("admin_password_hash"),
  
  // Опциональные переменные
  MODE: z.string().optional(),

  DB_PATH: z.string().default("./data/xpanel.db")
});

// Тип для TypeScript
export type EnvSchema = z.infer<typeof envSchema>;

// Функция валидации
export function validateEnv(): EnvSchema {
  try {
    const result = envSchema.parse(process.env);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:', error.issues);
    } else {
      console.error('❌ Unknown error during validation:', error);
    }
    process.exit(1);
  }
}