// src/config/validation.ts
import { z } from 'zod';

// Определение схемы для переменных окружения
export const envSchema = z.object({
  // Сервер
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // XRay конфигурация
  XRAY_BINARY: z.string().min(1, "XRAY_BINARY is required"),
  XRAY_CONFIG: z.string().min(1, "XRAY_CONFIG is required"),
  XRAY_LOCATION_ASSET: z.string().optional(),
  
  // Опциональные переменные
  MODE: z.string().optional(),
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
      console.error('❌ Environment validation failed:');
    } else {
      console.error('❌ Unknown error during validation:', error);
    }
    process.exit(1);
  }
}