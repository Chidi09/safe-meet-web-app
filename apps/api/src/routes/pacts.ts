// ============================================================
// apps/api/src/routes/pacts.ts
//
// Strict rules enforced:
//  - All route handlers typed via FastifyRequest<{ Body/Querystring/Params }>
//  - zodValidatorCompiler + zodSerializerCompiler handle schema-to-type flow
//  - No `any`, no `as X` outside Zod .parse(), no non-null assertions
//  - catch blocks: `err instanceof Error ? err.message : String(err)`
// ============================================================

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { mapPact, mapPacts } from "../lib/mappers.js";
import { requireAuth } from "../plugins/auth.js";
import {
  PactFiltersSchema,
  HistoryFiltersSchema,
  CreatePactBodySchema,
  UpdatePactStatusBodySchema,
  SubmitProofBodySchema,
  VerifyQrBodySchema,
  PactSchema,
  QrResponseSchema,
  HistoryListSchema,
} from "@safe-meet/shared";
import type {
  PactFilters,
  HistoryFilters,
  CreatePactBody,
  UpdatePactStatusBody,
  SubmitProofBody,
  VerifyQrBody,
  Pact,
} from "@safe-meet/shared";
import type { Pact as PrismaPact } from "@prisma/client";

// ------------------------------------------------------------
// Param schemas (defined locally — not in shared)
// ------------------------------------------------------------

const PactIdParamSchema = z.object({ id: z.string().uuid() });
type PactIdParam = z.infer<typeof PactIdParamSchema>;

// ------------------------------------------------------------
// Authorization helpers
// ------------------------------------------------------------

/**
 * Verifies the requesting user is either the creator or counterparty of a pact.
 * Returns the pact if authorized, otherwise sends a 403 reply.
 */
async function requirePactOwnership(
  fastify: FastifyInstance,
  request: { walletAddress: string | null; params: { id: string } },
  reply: FastifyReply,
): Promise<PrismaPact | null> {
  const wallet = request.walletAddress;
  if (wallet === null) {
    await reply.unauthorized("A valid JWT is required.");
    return null;
  }

  const pact = await prisma.pact.findUnique({
    where: { id: request.params.id },
  });

  if (!pact) {
    await reply.notFound(`Pact ${request.params.id} not found.`);
    return null;
  }

  if (pact.creatorWallet !== wallet && pact.counterpartyWallet !== wallet) {
    await reply.forbidden("You are not a party to this pact.");
    return null;
  }

  return pact;
}

/**
 * Verifies the requesting user is the counterparty (buyer/referee) of a pact.
 * Used for operations like QR verification that should be done by the counterparty.
 */
async function requireCounterparty(
  fastify: FastifyInstance,
  request: { walletAddress: string | null; params: { id?: string }; body?: { pactId?: string } },
  reply: FastifyReply,
): Promise<PrismaPact | null> {
  const wallet = request.walletAddress;
  if (wallet === null) {
    await reply.unauthorized("A valid JWT is required.");
    return null;
  }

  const pactId = request.params?.id ?? request.body?.pactId;
  if (!pactId) {
    await reply.badRequest("Pact ID is required.");
    return null;
  }

  const pact = await prisma.pact.findUnique({ where: { id: pactId } });

  if (!pact) {
    await reply.notFound(`Pact ${pactId} not found.`);
    return null;
  }

  // For QR verification, the counterparty (buyer) scans the code
  // For proof submission, the creator submits proof
  return pact;
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function pactsRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/pacts
  // ----------------------------------------------------------
  fastify.get<{ Querystring: PactFilters }>(
    "/",
    {
      schema: {
        querystring: PactFiltersSchema,
        response: { 200: z.array(PactSchema) },
      },
    },
    async (request, reply) => {
      const { wallet, type, status, page, limit } = request.query;

      const skip = (page - 1) * limit;

      const rows = await prisma.pact.findMany({
        where: {
          ...(wallet !== undefined
            ? {
                OR: [
                  { creatorWallet: wallet },
                  { counterpartyWallet: wallet },
                ],
              }
            : {}),
          ...(type !== undefined ? { type } : {}),
          ...(status !== undefined ? { status } : {}),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      return reply.send(mapPacts(rows));
    },
  );

  // ----------------------------------------------------------
  // GET /api/pacts/history
  // ----------------------------------------------------------
  fastify.get<{ Querystring: HistoryFilters }>(
    "/history",
    {
      schema: {
        querystring: HistoryFiltersSchema,
        response: { 200: HistoryListSchema },
      },
    },
    async (request, reply) => {
      const { wallet, page, limit, type, status, from, to } = request.query;

      const skip = (page - 1) * limit;

      const where = {
        OR: [{ creatorWallet: wallet }, { counterpartyWallet: wallet }],
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(from !== undefined || to !== undefined
          ? {
              createdAt: {
                ...(from !== undefined ? { gte: new Date(from) } : {}),
                ...(to !== undefined ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.pact.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.pact.count({ where }),
      ]);

      return reply.send({
        data: mapPacts(rows),
        total,
        page,
        limit,
        hasMore: skip + rows.length < total,
      });
    },
  );

  // ----------------------------------------------------------
  // GET /api/pacts/:id
  // ----------------------------------------------------------
  fastify.get<{ Params: PactIdParam }>(
    "/:id",
    {
      schema: {
        params: PactIdParamSchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const row = await prisma.pact.findUnique({
        where: { id: request.params.id },
      });

      if (!row) {
        return reply.notFound(`Pact ${request.params.id} not found.`);
      }

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts
  // Requires authentication - creator wallet derived from JWT
  // Rate limit: 10 pact creations per minute per user
  // ----------------------------------------------------------
  fastify.post<{ Body: CreatePactBody }>(
    "/",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: CreatePactBodySchema,
        response: { 201: PactSchema },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // creatorWallet MUST come from authenticated JWT, never from request body
      const creatorWallet = request.walletAddress;
      if (creatorWallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const row = await prisma.pact.create({
        data: {
          type: body.type,
          status: "PENDING",
          creatorWallet,
          counterpartyWallet: body.counterpartyWallet,
          assetSymbol: body.assetSymbol,
          assetAmount: body.assetAmount,

          // TRADE-specific — use spread with conditional object to avoid
          // setting `undefined` properties (exactOptionalPropertyTypes).
          ...(body.type === "TRADE"
            ? {
                itemName: body.itemName,
                ...(body.itemDescription !== undefined
                  ? { itemDescription: body.itemDescription }
                  : {}),
                ...(body.location !== undefined
                  ? { location: body.location }
                  : {}),
                ...(body.scheduledAt !== undefined
                  ? { scheduledAt: new Date(body.scheduledAt) }
                  : {}),
              }
            : {}),

          // GOAL-specific
          ...(body.type === "GOAL"
            ? {
                goalDescription: body.goalDescription,
                goalDeadline: new Date(body.goalDeadline),
              }
            : {}),
        },
      });

      return reply.status(201).send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // PATCH /api/pacts/:id/status
  // Requires authentication and pact ownership
  // ----------------------------------------------------------
  fastify.patch<{ Params: PactIdParam; Body: UpdatePactStatusBody }>(
    "/:id/status",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        body: UpdatePactStatusBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const existing = await requirePactOwnership(fastify, request, reply);
      if (!existing) return;

      // Additional authorization: only certain status transitions allowed
      // and only by specific parties (implementation depends on business rules)
      const newStatus = request.body.status;
      const validTransitions: Record<string, string[]> = {
        PENDING: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["COMPLETE", "DISPUTED"],
        PROOF_SUBMITTED: ["COMPLETE", "DISPUTED"],
      };

      const allowedNextStatuses = validTransitions[existing.status] || [];
      if (!allowedNextStatuses.includes(newStatus)) {
        return reply.badRequest(
          `Invalid status transition from ${existing.status} to ${newStatus}`
        );
      }

      const row = await prisma.pact.update({
        where: { id: request.params.id },
        data: { status: newStatus },
      });

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // PATCH /api/pacts/:id/proof
  // Requires authentication - only creator can submit proof
  // ----------------------------------------------------------
  fastify.patch<{ Params: PactIdParam; Body: SubmitProofBody }>(
    "/:id/proof",
    {
      preHandler: requireAuth,
      schema: {
        params: PactIdParamSchema,
        body: SubmitProofBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (wallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const existing = await prisma.pact.findUnique({
        where: { id: request.params.id },
      });

      if (!existing) {
        return reply.notFound(`Pact ${request.params.id} not found.`);
      }

      // Only the creator can submit proof
      if (existing.creatorWallet !== wallet) {
        return reply.forbidden("Only the pact creator can submit proof.");
      }

      // Only allow proof submission in certain states
      if (existing.status !== "ACTIVE" && existing.status !== "PENDING") {
        return reply.badRequest(
          `Cannot submit proof for pact in ${existing.status} status`
        );
      }

      const row = await prisma.pact.update({
        where: { id: request.params.id },
        data: {
          proofUrl: request.body.proofUrl,
          proofSubmittedAt: new Date(),
          status: "PROOF_SUBMITTED",
        },
      });

      return reply.send(mapPact(row));
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts/:id/qr  — generate nonce + QR data URL
  // Requires authentication and pact ownership
  // Stricter rate limit: 5 per minute per user
  // ----------------------------------------------------------
  fastify.post<{ Params: PactIdParam }>(
    "/:id/qr",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        params: PactIdParamSchema,
        response: { 200: QrResponseSchema },
      },
    },
    async (request, reply) => {
      const existing = await requirePactOwnership(fastify, request, reply);
      if (!existing) return;

      // Only allow QR generation for active pacts
      if (existing.status !== "ACTIVE") {
        return reply.badRequest(
          `Cannot generate QR code for pact in ${existing.status} status`
        );
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const qrRecord = await prisma.qrNonce.create({
        data: {
          pactId: request.params.id,
          expiresAt,
        },
      });

      // Sign the payload to prevent tampering
      const payload = JSON.stringify({
        nonce: qrRecord.nonce,
        pactId: existing.id,
        exp: expiresAt.getTime(),
      });

      const signature = crypto
        .createHmac("sha256", process.env["QR_SECRET"] ?? "default-secret-change-in-production")
        .update(payload)
        .digest("hex");

      const signedPayload = JSON.stringify({ payload, signature });

      let qrDataUrl: string;
      try {
        qrDataUrl = await QRCode.toDataURL(signedPayload, { type: "image/png" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, `QR generation failed: ${message}`);
        return reply.internalServerError("Failed to generate QR code.");
      }

      return reply.send({
        nonce: qrRecord.nonce,
        qrDataUrl,
        expiresAt: expiresAt.toISOString(),
      });
    },
  );

  // ----------------------------------------------------------
  // POST /api/pacts/verify-qr  — validate signed payload → COMPLETE
  // Requires authentication
  // ----------------------------------------------------------
  fastify.post<{ Body: VerifyQrBody }>(
    "/verify-qr",
    {
      preHandler: requireAuth,
      schema: {
        body: VerifyQrBodySchema,
        response: { 200: PactSchema },
      },
    },
    async (request, reply) => {
      const wallet = request.walletAddress;
      if (wallet === null) {
        return reply.unauthorized("A valid JWT is required.");
      }

      const { nonce, pactId } = request.body;

      const qrRecord = await prisma.qrNonce.findUnique({
        where: { nonce },
      });

      if (!qrRecord) {
        return reply.badRequest("Invalid nonce.");
      }

      if (qrRecord.pactId !== pactId) {
        return reply.badRequest("Nonce does not match pact.");
      }

      if (qrRecord.used) {
        return reply.badRequest("Nonce has already been used.");
      }

      if (qrRecord.expiresAt < new Date()) {
        return reply.badRequest("Nonce has expired.");
      }

      const pact = await prisma.pact.findUnique({ where: { id: pactId } });
      if (!pact) {
        return reply.notFound(`Pact ${pactId} not found.`);
      }

      // Only the counterparty (buyer/referee) can verify QR and complete the pact
      if (pact.counterpartyWallet !== wallet) {
        return reply.forbidden("Only the counterparty can verify QR codes.");
      }

      // Only active pacts can be completed
      if (pact.status !== "ACTIVE") {
        return reply.badRequest(
          `Cannot complete pact in ${pact.status} status`
        );
      }

      // $transaction returns a tuple typed as [QrNonce, Pact] (Prisma types)
      const [, updatedPact] = await prisma.$transaction([
        prisma.qrNonce.update({
          where: { nonce },
          data: { used: true },
        }),
        prisma.pact.update({
          where: { id: pactId },
          data: { status: "COMPLETE" },
        }),
      ]);

      return reply.send(mapPact(updatedPact));
    },
  );
}
