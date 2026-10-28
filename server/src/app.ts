// buildApp(): instância Fastify sem listen (usada pelo index.ts e pelos testes).
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config, isProd, isTest, llmEnabled } from "./config";
import { AppError } from "./lib/errors";
import { prisma } from "./lib/prisma";
import authPlugin from "./plugins/auth";
import { authRoutes } from "./modules/auth/routes";
import { chatRoutes } from "./modules/chat/routes";
import { healthUnitRoutes } from "./modules/healthUnits/routes";
import { journeyRoutes } from "./modules/journey/routes";
import { meRoutes } from "./modules/me/routes";

export type App = FastifyInstance;

export async function buildApp(): Promise<App> {
  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: config.LOG_LEVEL,
          ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
        },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Aceita corpo vazio com content-type application/json (DELETE /me, POST
  // /me/relapse sem body): o parser padrão do Fastify responderia 400.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const text = typeof body === "string" ? body : body.toString("utf8");
    if (text.trim() === "") return done(null, undefined);
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      e.statusCode = 400;
      done(e, undefined);
    }
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: false,
    // O padrão do @fastify/cors libera só GET/HEAD/POST no preflight; o app
    // usa PUT (check-ins, perfil), PATCH e DELETE (conta, chat).
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type"],
  });
  await app.register(rateLimit, {
    global: true,
    max: isTest ? 10_000 : 300,
    timeWindow: "1 minute",
    // statusCode é obrigatório: sem ele o error handler trataria como 500.
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: { code: "RATE_LIMITED", message: "Muitas requisições. Tente novamente em instantes." },
    }),
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "LiberAr API",
        description:
          "API do aplicativo LiberAr — apoio à cessação do tabagismo (TCC + PNCT). " +
          "Contrato completo em docs/backend-architecture.md.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      },
      tags: [
        { name: "system", description: "Saúde do serviço" },
        { name: "auth", description: "Cadastro, login e senha" },
        { name: "me", description: "Conta e perfil" },
        { name: "journey", description: "Check-ins, recaídas, Fagerström, tratamento, gatilhos" },
        { name: "chat", description: "Assistente LiberAr" },
        { name: "health-units", description: "Localizador UBS/CAPS" },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(authPlugin);

  // Formato único de erro: { error: { code, message, details? } }
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: {
            issues: error.validation.map((v) => ({
              path: v.instancePath.replace(/^\//, "").replace(/\//g, "."),
              message: v.message,
            })),
          },
        },
      });
    }
    if (isResponseSerializationError(error)) {
      request.log.error(error, "Erro de serialização da resposta");
      return reply.status(500).send({
        error: { code: "INTERNAL_ERROR", message: "Erro ao serializar a resposta" },
      });
    }
    const err = error as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Muitas requisições. Tente novamente em instantes." },
      });
    }
    if (status >= 500) request.log.error(error);
    return reply.status(status).send({
      error: {
        code: status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR",
        message: status >= 500 ? "Erro interno" : (err.message ?? "Requisição inválida"),
      },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: "NOT_FOUND", message: "Rota não encontrada" } })
  );

  app.get("/", { schema: { tags: ["system"], hide: true } }, async () => ({
    name: "LiberAr API",
    version: "1.0.0",
    docs: "/docs",
    health: "/health",
    app: "o aplicativo roda no Expo (porta 8081); esta porta é apenas a API",
  }));

  app.get("/health", { schema: { tags: ["system"] } }, async () => {
    let db: "ok" | "error" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "error";
    }
    return { status: "ok", db, llm: llmEnabled ? "claude" : "rules" };
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(meRoutes, { prefix: "/me" });
  await app.register(journeyRoutes, { prefix: "/me" });
  await app.register(chatRoutes, { prefix: "/me/chat" });
  await app.register(healthUnitRoutes, { prefix: "/health-units" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
