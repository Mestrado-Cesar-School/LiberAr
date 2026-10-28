// Rotas de autenticação (/auth). Contrato: docs/backend-architecture.md §4-5.
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { isTest } from "../../config";
import { emailSchema, passwordSchema, profileInputSchema } from "../../domain/schemas";
import { verifyAppleIdentityToken, verifyGoogleIdToken } from "./oauth";
import {
  isEmailAvailable,
  login,
  oauthLogin,
  register,
  requestPasswordReset,
  resetPassword,
} from "./service";
import { revokeRefreshToken, rotateRefreshToken } from "./tokens";

// Limite mais restrito por IP nas rotas de auth (o global é 300/min).
const authRateLimit = { rateLimit: { max: isTest ? 1000 : 30, timeWindow: "1 minute" } };
const tags = ["auth"];

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  profile: profileInputSchema,
  acceptedTerms: z.literal(true, { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade" }),
});

const refreshSchema = z.object({ refreshToken: z.string().min(20).max(512) });

export const authRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/check-email",
    { config: authRateLimit, schema: { tags, body: z.object({ email: emailSchema }) } },
    async (request) => ({ available: await isEmailAvailable(request.body.email) })
  );

  app.post("/register", { config: authRateLimit, schema: { tags, body: registerSchema } }, async (request, reply) => {
    const result = await register(app, request.body);
    return reply.code(201).send(result);
  });

  app.post(
    "/login",
    { config: authRateLimit, schema: { tags, body: z.object({ email: emailSchema, password: z.string().min(1).max(128) }) } },
    async (request) => login(app, request.body.email, request.body.password)
  );

  app.post("/refresh", { config: authRateLimit, schema: { tags, body: refreshSchema } }, async (request) =>
    rotateRefreshToken(app, request.body.refreshToken)
  );

  app.post("/logout", { config: authRateLimit, schema: { tags, body: refreshSchema } }, async (request, reply) => {
    await revokeRefreshToken(request.body.refreshToken);
    return reply.code(204).send();
  });

  app.post(
    "/forgot-password",
    { config: authRateLimit, schema: { tags, body: z.object({ email: emailSchema }) } },
    async (request, reply) => {
      await requestPasswordReset(request.body.email, request.log);
      return reply.code(202).send({});
    }
  );

  app.post(
    "/reset-password",
    {
      config: authRateLimit,
      schema: {
        tags,
        body: z.object({
          email: emailSchema,
          code: z.string().regex(/^\d{6}$/, "O código tem 6 dígitos"),
          newPassword: passwordSchema,
        }),
      },
    },
    async (request, reply) => {
      await resetPassword(request.body.email, request.body.code, request.body.newPassword);
      return reply.code(204).send();
    }
  );

  app.post(
    "/oauth/google",
    {
      config: authRateLimit,
      schema: { tags, body: z.object({ idToken: z.string().min(10), profile: profileInputSchema.optional() }) },
    },
    async (request) => {
      const identity = await verifyGoogleIdToken(request.body.idToken);
      return oauthLogin(app, "google", identity, { profile: request.body.profile });
    }
  );

  app.post(
    "/oauth/apple",
    {
      config: authRateLimit,
      schema: {
        tags,
        body: z.object({
          identityToken: z.string().min(10),
          fullName: z.string().trim().max(80).optional(),
          profile: profileInputSchema.optional(),
        }),
      },
    },
    async (request) => {
      const identity = await verifyAppleIdentityToken(request.body.identityToken);
      return oauthLogin(app, "apple", identity, {
        fullName: request.body.fullName,
        profile: request.body.profile,
      });
    }
  );
};
