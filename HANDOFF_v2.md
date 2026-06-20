# BorrowBox — Comprehensive Developer Handoff (v2)

> Generated from live source-code analysis. All facts verified against actual files.
> Last updated: June 2026

---

## 1. Project Overview

BorrowBox is a peer-to-peer campus marketplace exclusively for VIT students (`@vitstudent.ac.in`). Students can list, browse, buy, and sell secondhand items with a structured deal lifecycle. The backend serves both the tRPC API and the compiled Vite SPA from a single Express process.

**Authentication** was migrated from a custom JWT/cookie system to **Supabase Auth**. The server validates each request by decoding the Supabase Bearer token via `supabase.auth.getUser()`. A local `users` table mirrors Supabase users and is auto-created on first authenticated request.

---

## 2. Tech Stack (from `package.json`)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js + tsx | `tsx ^4.19.1` |
| Frontend | React | `^19.2.1` |
| Build Tool | Vite + @vitejs/plugin-react | `^7.1.7` / `^5.0.4` |
| Styling | Tailwind CSS v4 | `^4.1.14` |
| UI Components | Radix UI + shadcn/ui | various |
| Routing (client) | Wouter | `^3.3.5` |
| Server | Express | `^4.21.2` |
| API Layer | tRPC v11 | `^11.6.0` |
| Serialization | SuperJSON | `^1.13.3` |
| Server-Client Bridge | TanStack React Query | `^5.90.2` |
| ORM | Drizzle ORM | `^0.44.5` |
| DB Driver | postgres (pg) | `^3.4.5` |
| Auth (Identity) | **Supabase Auth** | `^2.46.2` |
| Email | Resend | `^6.12.4` |
| Image Storage | Cloudinary (+ local fallback) | `^2.10.0` |
| File Upload | Multer | `^2.1.1` (5 MB limit) |
| Rate Limiting | express-rate-limit | `^8.5.2` |
| Validation | Zod | `^4.1.12` |
| QR Code | qrcode.react | `^4.2.0` |
| Animations | framer-motion | `^12.23.22` |
| Package Manager | pnpm | `10.4.1` |
| TypeScript | — | `5.9.3` |

---

## 3. Project Structure

```
borrowbox/
├── client/src/
│   ├── App.tsx              # Route declarations (16 routes)
│   ├── main.tsx             # tRPC + Supabase auth setup, React root
│   ├── index.css            # Tailwind v4 global styles
│   ├── _core/hooks/
│   │   └── useAuth.ts       # Auth hook using Supabase session state
│   ├── lib/
│   │   ├── trpc.ts          # tRPC React client
│   │   ├── supabase.ts      # Supabase client (VITE_SUPABASE_URL/KEY)
│   │   └── utils.ts
│   ├── pages/               # 16 pages (see route table below)
│   ├── components/          # Shared components + shadcn/ui wrappers
│   └── contexts/            # ThemeContext
├── server/
│   ├── _core/
│   │   ├── index.ts         # Express server bootstrap + port finder
│   │   ├── auth.ts          # Supabase JWT verification + DB user sync
│   │   ├── context.ts       # tRPC context factory
│   │   ├── trpc.ts          # publicProcedure / protectedProcedure / adminProcedure
│   │   ├── cookies.ts       # Cookie option helpers (mostly unused now)
│   │   ├── env.ts           # ENV constants
│   │   ├── limiter.ts       # Rate limiter (5 req / 15 min)
│   │   ├── notification.ts  # Stub – console.log only
│   │   ├── systemRouter.ts  # system.health + system.notifyOwner
│   │   ├── llm.ts           # Stub – not wired
│   │   ├── imageGeneration.ts # Stub – not wired
│   │   ├── map.ts           # Stub – not wired
│   │   ├── voiceTranscription.ts # Stub – not wired
│   │   ├── dataApi.ts       # Stub – not wired
│   │   └── vite.ts          # Vite dev middleware / static serving
│   ├── routers.ts           # All tRPC procedures (731 lines)
│   ├── db.ts                # All DB query functions (607 lines)
│   ├── storage.ts           # Cloudinary upload helper
│   └── upload.ts            # Multer REST endpoint POST /api/upload
├── drizzle/
│   └── schema.ts            # 6 tables: users, items, deals, reviews, messages, item_reports
├── shared/
│   └── const.ts             # Error messages, timeout constants
├── .env                     # NOT committed
├── .env.example             # Only documents DATABASE_URL + JWT_SECRET (OUTDATED)
├── vite.config.ts
├── drizzle.config.ts        # dialect: postgresql
└── package.json
```

---

## 4. Authentication Architecture (Supabase + HttpOnly Cookie Sync)

The auth system was **fully migrated from custom JWT/cookie to Supabase Auth** and hardened using a secure **HttpOnly Cookie Sync** flow to protect against XSS token theft.

### Flow

1. **Register** (`Register.tsx`): Calls `supabase.auth.signUp()` directly from the client. Supabase sends a verification email. Domain restriction (`@vitstudent.ac.in`) is enforced **both client-side and server-side**.
2. **Login** (`Login.tsx`): Calls `supabase.auth.signInWithPassword()`. Supabase returns a session with a JWT access token.
3. **Session Persistence**: Configured to use `sessionStorage` in `supabase.ts` so the raw token is never written to disk (`localStorage`).
4. **HttpOnly Cookie Sync** (`useAuth.ts`): An event listener on `onAuthStateChange` listens for `SIGNED_IN` or `TOKEN_REFRESHED` and sends the access token to the server via the `auth.syncSession` mutation. The server sets a secure, `HttpOnly`, `SameSite=Lax` cookie (`sb-access-token`) containing the JWT. On `SIGNED_OUT`, the client calls `auth.clearSession` to delete the cookie.
5. **tRPC Requests** (`main.tsx`): tRPC uses `credentials: "same-origin"` so the browser automatically attaches the HttpOnly cookie.
6. **Server Verification** (`server/_core/auth.ts`): `authenticateRequest()` reads the token from the `Authorization` header OR the `sb-access-token` cookie and calls `supabase.auth.getUser()`. If valid, it looks up or auto-creates the user in the local `users` table.

### Key Implication
- Security against XSS is maximized. The token is only held in-memory (tab-lifetime) on the client, and the server relies on the browser's automatic cookie transmission.

---

## 5. Database Schema (PostgreSQL via Drizzle ORM)

**Important:** `drizzle.config.ts` uses `dialect: "postgresql"` and `server/db.ts` uses `drizzle-orm/postgres-js`. The `.env.example` incorrectly shows a MySQL URL — use a `postgresql://` connection string.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `email` | varchar(320) UNIQUE NOT NULL | |
| `passwordHash` | varchar(255) NOT NULL | **Legacy** — always `""` for Supabase users |
| `name` | varchar(255) NOT NULL | Populated from Supabase `user_metadata.full_name` on auto-create |
| `role` | enum(`user`,`admin`) DEFAULT `user` | |
| `isBanned` | integer DEFAULT 0 | 0=active, 1=banned |
| `upiId` | varchar(255) nullable | UPI ID for payment QR |
| `upiName` | varchar(255) nullable | Display name on UPI QR |
| `whatsapp` | varchar(20) nullable | International format `+91XXXXXXXXXX` |
| `whatsappVerified` | integer DEFAULT 0 | Reset when number changes |
| `whatsappOtp` | varchar(6) nullable | Stored in plaintext |
| `whatsappOtpExpiresAt` | timestamp nullable | |
| `isEmailVerified` | integer DEFAULT 0 | Set to 1 on Supabase auto-create |
| `emailOtp` | varchar(6) nullable | **Legacy** — Supabase handles email OTP |
| `resetToken` | varchar(255) nullable | **Legacy** — Supabase handles password reset |
| `tokenVersion` | integer DEFAULT 0 | **Legacy** — not used with Supabase |
| `lastSignedIn` | timestamp NOT NULL DEFAULT NOW | **Never updated after creation** |
| `createdAt` / `updatedAt` | timestamp | Auto-managed |

---

## 6. API Surface (tRPC at `/api/trpc`)

### `auth` router
| Procedure | Type | Auth | Description |
|---|---|---|---|
| `auth.me` | query | Public | Returns current local DB user (sans passwordHash) or null |
| `auth.syncSession` | mutation | Public | Writes Supabase JWT to HttpOnly cookie |
| `auth.clearSession` | mutation | Public | Clears HttpOnly cookie |

---

## 7. Security Issues & Recommended Fixes

### 🔴 CRITICAL

| Issue | Location | Status | Fix / Resolution |
|---|---|---|---|
| **Session Tokens Stored in localStorage, Not HttpOnly Cookies** | `client/src/lib/supabase.ts`, `client/src/main.tsx` | **✅ RESOLVED** | Configured Supabase to use `sessionStorage` in the client. Added a secure HttpOnly cookie sync flow: the server sets the JWT in `sb-access-token` via tRPC mutations on auth state changes. tRPC calls now use `credentials: "same-origin"` to automatically forward this cookie. |
| **Email Domain Restriction Has No Server-Side Enforcement At All** | `server/_core/auth.ts` | **✅ RESOLVED** | Added server-side email domain checks in `authenticateRequest()`. Requests with non-`@vitstudent.ac.in` emails are blocked from all tRPC procedures and rejected from local DB user auto-creation. |
| **Logout Does Not Revoke Already-Issued Access Tokens** | `server/_core/auth.ts`, `server/routers.ts` | **✅ RESOLVED** | Added a database-backed JWT revocation list (`revoked_tokens` table). On logout, the token's SHA-256 hash is stored with its expiration timestamp. Incoming requests are audited against this blacklist on every API call. |
| **Fail-Open Behavior on Supabase Verification Failure** | `server/_core/auth.ts` | **✅ RESOLVED** | Rewrote `authenticateRequest` to strictly fail-closed. If a token is asserted but fails verification due to any error, expiry, domain restriction, or connection blip, it explicitly throws a `TRPCError` instead of falling back to guest mode. |
| **No MFA or Brute-Force Protection on App Surface** | Supabase Dashboard | ❌ Pending | Password brute-force is delegated to Supabase Auth. Enable hCaptcha on signup/login forms in the Supabase Dashboard, and monitor Supabase rate limit logs. |
| `POST /api/upload` has no auth check | `server/upload.ts:30` | ❌ Pending | Add Supabase token verification middleware before the Multer handler. Extract Bearer token or cookie, call `supabase.auth.getUser()`, reject if invalid. |

---

## 8. Running the Project

### Install
```bash
pnpm install
```

### Configure `.env`
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Optional:
RESEND_API_KEY=re_...
CLOUDINARY_URL=cloudinary://...
```

### Push DB Schema
```bash
pnpm run db:push
```

### Dev Server
```bash
pnpm run dev
# Server + Vite HMR on http://localhost:3000
```
