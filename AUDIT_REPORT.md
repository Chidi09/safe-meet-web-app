# SafeMeet Security & Integration Audit Report

**Date:** 2026-03-26
**Auditor:** Claude Code
**Scope:** Full-stack review of SafeMeet monorepo

---

## 🔴 CRITICAL SECURITY VULNERABILITIES

### 1. **Missing Authentication on State-Changing Routes**

**Severity:** CRITICAL

The following routes accept state-changing requests WITHOUT authentication:

- `POST /api/pacts` - Anyone can create pacts spoofing any wallet address
- `PATCH /api/pacts/:id/status` - Anyone can update any pact's status
- `PATCH /api/pacts/:id/proof` - Anyone can submit proof for any pact
- `POST /api/pacts/:id/qr` - Anyone can generate QR codes for any pact
- `POST /api/pacts/verify-qr` - Anyone can complete any pact
- `PATCH /api/profile/:wallet` - Anyone can update any profile

**Impact:** Complete compromise of the escrow system. Attackers can:
- Complete trades without meeting
- Drain escrowed funds
- Impersonate any user
- Modify arbitrary profiles

**Fix Required:**
```typescript
// Add requireAuth preHandler to ALL state-changing routes
fastify.post<{ Body: CreatePactBody }>(
  "/",
  {
    preHandler: requireAuth,  // MISSING
    schema: { ... }
  },
  async (request, reply) => {
    // Enforce creatorWallet matches authenticated wallet
    const creatorWallet = request.walletAddress; // Never from body
```

### 2. **Missing Authorization Checks**

**Severity:** CRITICAL

Even if authentication is added, there's no authorization to verify:
- Is the user a party to this pact?
- Can this user update this specific resource?

**Example:** A user could update a pact they have no involvement in.

**Fix Required:**
```typescript
// Add ownership verification middleware
const requirePactOwnership = async (request, reply) => {
  const pact = await prisma.pact.findUnique({ where: { id: request.params.id } });
  if (!pact) return reply.notFound();
  
  if (pact.creatorWallet !== request.walletAddress && 
      pact.counterpartyWallet !== request.walletAddress) {
    return reply.forbidden("You are not a party to this pact");
  }
};
```

### 3. **No Rate Limiting**

**Severity:** HIGH

Endpoints vulnerable to abuse:
- QR generation (resource intensive)
- Pact creation (database spam)
- Status updates (state manipulation)

**Fix Required:**
Install `@fastify/rate-limit`:
```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Stricter limits for expensive operations
fastify.post('/:id/qr', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
}, handler);
```

### 4. **JWT Token Generation Missing**

**Severity:** HIGH

There's no endpoint to actually generate JWT tokens! The auth plugin expects a Bearer token, but:
- No `/api/auth/login` or `/api/auth/verify` endpoint
- No wallet signature verification
- No nonce generation for SIWE (Sign-In with Ethereum)

**Fix Required:**
Create auth endpoints that verify Ethereum signatures.

### 5. **QR Code Payload Not Signed**

**Severity:** MEDIUM

QR codes encode raw JSON without cryptographic signing:
```json
{"nonce": "uuid", "pactId": "uuid"}
```

Anyone can generate valid-looking QR payloads if they know UUIDs.

**Fix Required:**
Sign QR payload with server secret:
```typescript
import crypto from 'crypto';

const payload = JSON.stringify({ nonce, pactId, exp: Date.now() + 600000 });
const signature = crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
const qrData = JSON.stringify({ payload, signature });
```

### 6. **External URL XSS Risk**

**Severity:** MEDIUM

In `judgment-room/page.tsx`:
```tsx
<a href={pact.proofUrl} target="_blank" rel="noopener noreferrer">
```

No validation that proofUrl is safe. Could be `javascript:alert('xss')`.

**Fix Required:**
Add URL validation in schema:
```typescript
proofUrl: z.string().url().refine(
  url => url.startsWith('https://'),
  { message: "Proof URL must use HTTPS" }
)
```

### 7. **Weak CORS Configuration**

**Severity:** MEDIUM

```typescript
await fastify.register(cors, {
  origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
  credentials: true,
});
```

- Defaults to localhost in development (may leak to any localhost app)
- No origin validation in production
- credentials: true with loose origin checking is risky

**Fix Required:**
Strict origin validation and explicit allowed origins list.

---

## 🟡 MISSING IMPLEMENTATIONS

### 1. **No Error Boundaries**

**Location:** apps/web/src/app/

**Impact:** React errors will crash entire app. No graceful degradation.

**Fix:** Add `error.tsx` to each route segment.

### 2. **No Loading States**

**Location:** apps/web/src/app/

**Impact:** Poor UX with no loading indicators on route transitions.

**Fix:** Add `loading.tsx` to each route segment.

### 3. **No Not Found Pages**

**Location:** apps/web/src/app/

**Impact:** 404s show default Next.js error page.

**Fix:** Add `not-found.tsx` at root and segment levels.

### 4. **Profile Update Endpoint Broken**

**Location:** useSettings.ts:79-86

The frontend calls `/api/profile/${payload.wallet}` with PATCH, but:
- Backend route is `/:wallet` (no /api prefix in route file)
- Route is mounted at `/api/profile` in index.ts, so full path is `/api/profile/:wallet`
- But the hook uses raw fetch instead of apiClient
- No auth header sent with request

**Current Code:**
```typescript
const response = await fetch(`/api/profile/${payload.wallet}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },  // Missing auth header!
  body: JSON.stringify(payload),
});
```

**Fix:** Use apiClient and add auth token.

### 5. **No Database Migrations**

**Location:** apps/api/prisma/

**Impact:** Schema exists but no migration files. Cannot deploy to production.

**Fix:**
```bash
cd apps/api
npx prisma migrate dev --name init
```

### 6. **No Environment Configuration**

**Missing:**
- `.env` files for both apps
- Production env template
- Documentation on required env vars

### 7. **QR Code Uses Wrong Value**

**Location:** escrow/handshake/page.tsx:132

```tsx
<QRCode value={qrData.nonce} size={240} />
```

Should encode the full JSON payload `{nonce, pactId}`, not just the nonce string. The scanner expects the JSON object.

### 8. **No Input Sanitization**

**Risk:** Text fields (itemName, description) accept arbitrary content that could include:
- HTML/JS injection
- SQL injection (though Prisma protects against this)
- Script tags

**Fix:** Sanitize on frontend or use DOMPurify for any HTML rendering.

---

## 🔵 INTEGRATION ISSUES

### 1. **Type Mismatch in Pact Creation**

**Location:** apps/web/src/hooks/usePacts.ts

Hook expects `CreatePactBody` but the schema has discriminated union. May cause issues.

### 2. **WalletConnect Project ID Hardcoded Check**

**Location:** providers.tsx:16
```typescript
projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
```

Empty string fallback will cause RainbowKit to fail silently. Should throw error.

### 3. **API Client Mock Mode Confusion**

**Location:** client.ts:18-20

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
export const isMockMode = BASE_URL === "";
```

If API_URL is unset, all requests will fail (not mock). No actual mock implementation exists.

### 4. **TypeScript Path Mapping Issues**

**Location:** apps/web/tsconfig.json:28

```json
"@safe-meet/shared": ["../../packages/shared/src/index.ts"]
```

This works in dev but may fail in production builds. Better to use the workspace package directly.

### 5. **Missing Helmet CSP Configuration**

**Location:** apps/api/src/index.ts:53-56

```typescript
await fastify.register(helmet, {
  contentSecurityPolicy: process.env["NODE_ENV"] === "production",
});
```

CSP is just enabled/disabled, no actual policy configured.

---

## ✅ WHAT'S WORKING WELL

1. **Type Safety:** Excellent use of Zod + TypeScript throughout
2. **Schema Design:** Well-structured shared schemas with discriminated unions
3. **Frontend Architecture:** Good separation of concerns (hooks, api, components)
4. **Database Schema:** Proper indexing and relations
5. **Mapper Pattern:** Clean separation between DB and domain models
6. **React Query Integration:** Good caching and invalidation patterns
7. **UI Components:** Consistent design system with shadcn/ui

---

## 📋 PRIORITY FIX ORDER

### Phase 1: Security (CRITICAL - Do First)
1. Add authentication to ALL state-changing routes
2. Add authorization checks for resource ownership
3. Implement JWT token generation with SIWE
4. Add rate limiting

### Phase 2: Stability
5. Add error.tsx boundaries
6. Add loading.tsx states
7. Add not-found.tsx pages
8. Generate database migrations

### Phase 3: Polish
9. Fix profile update integration
10. Sign QR payloads
11. Add input sanitization
12. Create environment documentation

---

## 🛠️ IMMEDIATE ACTION REQUIRED

**Before this can be deployed to production:**

- [ ] All CRITICAL security issues must be fixed
- [ ] Authentication system must be complete
- [ ] Rate limiting must be implemented
- [ ] Database migrations must be generated
- [ ] Environment variables must be documented
- [ ] QR signing must be implemented

**Estimated time to production-ready:** 2-3 days of focused work

---

## ADDITIONAL RECOMMENDATIONS

1. **Add logging:** Implement structured logging for security events
2. **Add monitoring:** Track failed auth attempts, rate limit hits
3. **Add tests:** No test files exist in the codebase
4. **Add API documentation:** Use @fastify/swagger for auto-generated docs
5. **Add health checks:** Beyond basic /health, check DB connectivity
6. **Consider Web3 auth:** Implement proper SIWE (Sign-In with Ethereum)
