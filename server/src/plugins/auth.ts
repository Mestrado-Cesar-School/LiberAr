// Autenticação JWT: registra @fastify/jwt e o preHandler `app.authenticate`.
import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";
import { AppError } from "../lib/errors";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Sessão inválida ou expirada");
    }
  });
});

/** Emite o access token de um usuário. */
export function signAccessToken(app: { jwt: { sign: (p: { sub: string }) => string } }, userId: string) {
  return app.jwt.sign({ sub: userId });
}
