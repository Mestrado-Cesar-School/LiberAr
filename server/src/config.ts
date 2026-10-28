// Configuração via variáveis de ambiente, validada com Zod.
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter pelo menos 16 caracteres"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.string().default("info"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("LiberAr <no-reply@liberar.app>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
});

function loadConfig() {
  const raw = { ...process.env };
  // Strings vazias no .env contam como "não definido".
  for (const key of Object.keys(raw)) if (raw[key] === "") delete raw[key];
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida — ${issues}`);
  }
  return parsed.data;
}

export const config = loadConfig();
export type Config = typeof config;

export const isProd = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";
export const llmEnabled = Boolean(config.ANTHROPIC_API_KEY);
