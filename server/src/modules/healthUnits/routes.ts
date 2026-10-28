// Localizador de unidades de saúde (UBS/CAPS). Rotas públicas, dados do seed.
// Registrado em app.ts com prefixo /health-units.
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { serializeHealthUnit } from "../../lib/serialize";
import { haversineKm, normalize } from "./geo";

const TAGS = ["health-units"];

const listQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    kind: z.enum(["UBS", "CAPS"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: "lat e lng devem ser informados juntos",
    path: ["lat"],
  });

export const healthUnitRoutes: FastifyPluginAsync = async (instance) => {
  const app = instance.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Lista unidades (busca, filtro por tipo e ordenação por distância)",
        querystring: listQuery,
      },
    },
    async (request) => {
      const { q, kind, lat, lng } = request.query;
      let rows = await prisma.healthUnit.findMany({
        where: kind ? { kind } : undefined,
        orderBy: { name: "asc" },
      });

      if (q) {
        const needle = normalize(q);
        if (needle) {
          rows = rows.filter(
            (u) =>
              normalize(u.name).includes(needle) ||
              normalize(u.address).includes(needle) ||
              (u.city ? normalize(u.city).includes(needle) : false) ||
              u.services.some((s) => normalize(s).includes(needle))
          );
        }
      }

      const hasOrigin = lat !== undefined && lng !== undefined;
      const units = rows.map((u) => {
        const distance =
          hasOrigin && u.lat !== null && u.lng !== null
            ? haversineKm(lat, lng, u.lat, u.lng)
            : u.distanceKm;
        return serializeHealthUnit(u, distance);
      });
      units.sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name, "pt-BR"));
      return units;
    }
  );

  app.get(
    "/:id",
    {
      schema: {
        tags: TAGS,
        summary: "Detalhe de uma unidade",
        params: z.object({ id: z.string().min(1).max(80) }),
      },
    },
    async (request) => {
      const row = await prisma.healthUnit.findUnique({ where: { id: request.params.id } });
      if (!row) throw notFound("Unidade de saúde");
      return serializeHealthUnit(row);
    }
  );
};
