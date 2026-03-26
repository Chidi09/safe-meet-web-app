// ============================================================
// apps/api/src/index.ts
//
// Fastify v5 server — ESM, Zod type provider, Prisma ORM.
// ============================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod";

import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import pactsRoutes from "./routes/pacts.js";
import dashboardRoutes from "./routes/dashboard.js";
import profileRoutes from "./routes/profile.js";
import sessionsRoutes from "./routes/sessions.js";

// ------------------------------------------------------------
// Server factory — separated for testability
// ------------------------------------------------------------

export async function buildServer() {
  const isDev = process.env["NODE_ENV"] !== "production";
  
  const fastify = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      ...(isDev ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true }
        }
      } : {}),
    },
  });

  // ----------------------------------------------------------
  // Zod type provider — must be set before any route/schema
  // ----------------------------------------------------------
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // ----------------------------------------------------------
  // Core plugins
  // ----------------------------------------------------------
  await fastify.register(cors, {
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  await fastify.register(helmet, {
    // CSP can be tuned per environment; keep permissive in dev.
    contentSecurityPolicy: process.env["NODE_ENV"] === "production",
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (req, context) => ({
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded. Retry after ${context.after}`,
      statusCode: 429,
    }),
  });

  await fastify.register(sensible);

  await fastify.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "change-me-in-development",
  });

  // ----------------------------------------------------------
  // Auth plugin — decorates request.walletAddress
  // ----------------------------------------------------------
  await fastify.register(authPlugin);

  // ----------------------------------------------------------
  // Health check  (outside /api/ prefix — infra can hit this)
  // ----------------------------------------------------------
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal("ok"),
            ts: z.string().datetime({ offset: true }),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ status: "ok", ts: new Date().toISOString() });
    },
  );

  // ----------------------------------------------------------
  // API routes — all mounted under /api/
  // ----------------------------------------------------------
  await fastify.register(
    async (api) => {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(dashboardRoutes, { prefix: "/dashboard" });
      await api.register(pactsRoutes, { prefix: "/pacts" });
      await api.register(profileRoutes, { prefix: "/profile" });
      await api.register(sessionsRoutes, { prefix: "/sessions" });
    },
    { prefix: "/api" },
  );

  return fastify;
}

// ------------------------------------------------------------
// Bootstrap — only run when not in serverless environment
// ------------------------------------------------------------

if (process.env["VERCEL"] !== "1" && import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    const port = Number(process.env["PORT"] ?? 4000);
    const host = process.env["HOST"] ?? "0.0.0.0";

    const server = await buildServer();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      server.log.info({ signal }, "Shutdown signal received — closing server.");
      await server.close();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    try {
      await server.listen({ port, host });
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  }

  main();
}
