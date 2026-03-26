// ============================================================
// apps/api/src/routes/dashboard.ts
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { DashboardStatsSchema } from "@safe-meet/shared";
import type { DashboardStats } from "@safe-meet/shared";

const DashboardQuerySchema = z.object({
  wallet: z.string().optional(),
});

type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // ----------------------------------------------------------
  // GET /api/dashboard/stats?wallet=
  // ----------------------------------------------------------
  fastify.get<{ Querystring: DashboardQuery }>(
    "/stats",
    {
      schema: {
        querystring: DashboardQuerySchema,
        response: { 200: DashboardStatsSchema },
      },
    },
    async (request, reply) => {
      const { wallet } = request.query;

      // Build a where clause scoped to the wallet when provided.
      const walletWhere = wallet
        ? {
            OR: [
              { creatorWallet: wallet },
              { counterpartyWallet: wallet },
            ],
          }
        : {};

      // Aggregate in a single round-trip.
      const [completedPacts, activePacts, proofSubmittedPacts, tvlResult] =
        await Promise.all([
          prisma.pact.count({
            where: { ...walletWhere, status: "COMPLETE" },
          }),
          prisma.pact.count({
            where: { ...walletWhere, status: "ACTIVE" },
          }),
          prisma.pact.count({
            where: { ...walletWhere, status: "PROOF_SUBMITTED" },
          }),
          // Sum of assetAmount for all ACTIVE pacts = TVL proxy.
          prisma.pact.aggregate({
            where: { ...walletWhere, status: "ACTIVE" },
            _sum: { assetAmount: true },
          }),
        ]);

      const tvl = tvlResult._sum.assetAmount ?? 0;

      // When the wallet has no pacts at all, return realistic-looking
      // mock stats so the dashboard isn't empty on first visit.
      const hasActivity =
        completedPacts + activePacts + proofSubmittedPacts > 0;

      const stats: DashboardStats = hasActivity
        ? {
            totalValueLocked: tvl,
            totalValueLockedFormatted: `${tvl.toFixed(4)} ETH`,
            tvlChangePercent: 0, // would require historical snapshot to compute
            completedTrades: completedPacts,
            activeEscrows: activePacts,
            awaitingVerification: proofSubmittedPacts,
          }
        : {
            totalValueLocked: 0,
            totalValueLockedFormatted: "0 ETH",
            tvlChangePercent: 0,
            completedTrades: 0,
            activeEscrows: 0,
            awaitingVerification: 0,
          };

      return reply.send(stats);
    },
  );
}
