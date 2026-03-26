// ============================================================
// apps/api/src/routes/auth.ts
//
// SIWE (Sign-In with Ethereum) authentication flow.
// Generates JWT tokens after verifying Ethereum signatures.
// ============================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { recoverMessageAddress } from "viem";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../plugins/auth.js";

// ------------------------------------------------------------
// Schemas
// ------------------------------------------------------------

const GetNonceResponseSchema = z.object({
  nonce: z.string(),
  expiresAt: z.string().datetime(),
});

const VerifyBodySchema = z.object({
  message: z.string(), // SIWE message
  signature: z.string(), // Ethereum signature
});

const VerifyResponseSchema = z.object({
  token: z.string(),
  wallet: z.string(),
  expiresAt: z.string().datetime(),
});

// ------------------------------------------------------------
// SIWE Message Parser (simplified)
// ------------------------------------------------------------

interface ParsedSiweMessage {
  address: string;
  nonce: string;
  chainId: number;
}

function parseSiweMessage(message: string): ParsedSiweMessage | null {
  // Simple parser for SIWE format:
  // "domain.com wants you to sign in with your Ethereum account:\n0x...\n\nSign in\n\nNonce: xxx\nChain ID: 1"
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
  const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);
  const chainIdMatch = message.match(/Chain ID: (\d+)/);

  if (!addressMatch || !nonceMatch) return null;

  const nonce = nonceMatch[1];
  if (!nonce) return null;

  return {
    address: addressMatch[0],
    nonce,
    chainId: chainIdMatch?.[1] ? parseInt(chainIdMatch[1], 10) : 1,
  };
}

// ------------------------------------------------------------
// Signature Verification (placeholder for real implementation)
// ------------------------------------------------------------

async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// Plugin
// ------------------------------------------------------------

export default async function authRoutes(fastify: FastifyInstance) {
  // Store nonces in memory (use Redis in production)
  const nonces = new Map<string, { wallet: string; expires: number }>();

  // ----------------------------------------------------------
  // GET /api/auth/nonce
  // Generate a nonce for SIWE signing
  // ----------------------------------------------------------
  fastify.get(
    "/nonce",
    {
      schema: {
        response: { 200: GetNonceResponseSchema },
      },
    },
    async (request, reply) => {
      const nonce = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store temporarily (in production: use Redis with TTL)
      nonces.set(nonce, { wallet: "", expires: expiresAt.getTime() });

      // Clean up old nonces periodically
      const now = Date.now();
      for (const [key, value] of nonces.entries()) {
        if (value.expires < now) {
          nonces.delete(key);
        }
      }

      return reply.send({
        nonce,
        expiresAt: expiresAt.toISOString(),
      });
    }
  );

  // ----------------------------------------------------------
  // POST /api/auth/verify
  // Verify signature and issue JWT
  // ----------------------------------------------------------
  fastify.post<{ Body: { message: string; signature: string } }>(
    "/verify",
    {
      schema: {
        body: VerifyBodySchema,
        response: { 200: VerifyResponseSchema },
      },
    },
    async (request, reply) => {
      const { message, signature } = request.body;

      const parsed = parseSiweMessage(message);
      if (!parsed) {
        return reply.badRequest("Invalid SIWE message format.");
      }

      // Verify the nonce exists and hasn't expired
      const nonceData = nonces.get(parsed.nonce);
      if (!nonceData) {
        return reply.badRequest("Invalid or expired nonce.");
      }

      if (nonceData.expires < Date.now()) {
        nonces.delete(parsed.nonce);
        return reply.badRequest("Nonce has expired.");
      }

      // Verify signature
      const isValid = await verifySignature(message, signature, parsed.address);
      if (!isValid) {
        return reply.unauthorized("Invalid signature.");
      }

      // Clean up used nonce
      nonces.delete(parsed.nonce);

      // Create or update session
      const session = await prisma.session.create({
        data: {
          wallet: parsed.address,
          chainId: parsed.chainId,
          chainName: getChainName(parsed.chainId),
          deviceName: request.headers["user-agent"] || "Unknown",
        },
      });

      // Generate JWT
      const token = await reply.jwtSign({
        wallet: parsed.address,
        sessionId: session.id,
      });

      // Calculate expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update session with expiration
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt },
      });

      return reply.send({
        token,
        wallet: parsed.address,
        expiresAt: expiresAt.toISOString(),
      });
    }
  );

  // ----------------------------------------------------------
  // POST /api/auth/logout
  // Revoke current session
  // ----------------------------------------------------------
  fastify.post(
    "/logout",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      // TODO: Implement session revocation
      // Would need to track JWT jti or use session ID
      return reply.send({ success: true });
    }
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon",
    8453: "Base Mainnet",
    84532: "Base Sepolia",
  };
  return chains[chainId] || `Chain ${chainId}`;
}
