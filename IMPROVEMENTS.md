# BorrowBox Architecture & Technical Audit Findings

This document outlines technical debt, security risks, performance bottlenecks, and architectural improvements for the BorrowBox codebase, ordered strictly by priority (**Critical ➔ High ➔ Medium ➔ Low**).

---

## 🔴 CRITICAL PRIORITY

### 1. Unsanitized Direct File Upload Before Content Moderation Validation
- **Location:** [server/upload.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/upload.ts#L65-L115) & [server/_core/index.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/index.ts#L89-L90)
- **Impact:** The `/api/upload` endpoint processes multipart file uploads, writes them directly to local disk (`/uploads`) or uploads them directly to Cloudinary *before* any text keyword moderation or Google Cloud Vision API safety check is performed. An attacker can host inappropriate, NSFW, or explicit content on the server or Cloudinary CDN indefinitely simply by invoking the upload endpoint without completing item creation.
- **Recommended Fix:** Store uploaded files in a temporary volatile directory (or memory buffer) and execute `checkImageSafety()` and magic bytes validation *before* committing the asset to Cloudinary or permanent storage. Delete unreferenced temporary uploads after 1 hour.

### 2. Missing Rate Limiting on Public Read & Heavy Database Search Endpoints
- **Location:** [server/_core/index.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/index.ts#L93-L108) & [server/routers.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/routers.ts#L586-L596)
- **Impact:** While mutation procedures (`auth.register`, `items.create`, `deals.confirmWithPin`) have rate limiters attached, heavy read procedures—specifically `items.getAll` (full-text search), `items.getPriceSuggestion` (multi-stage SQL join), and `items.getById`—have zero rate limiting. Malicious bots can flood full-text tsquery searches and median price calculations, consuming database CPU and causing connection pool exhaustion.
- **Recommended Fix:** Attach `readLimiter` (e.g. 120 requests/minute per IP/userId) to `/api/trpc/items.getAll` and `/api/trpc/items.getPriceSuggestion` in `server/_core/index.ts`.

### 3. Insecure Default Fallback for JWT Secrets and Cryptographic Keys
- **Location:** [server/_core/auth.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/auth.ts#L9-L12) & [server/pin.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/pin.ts#L10-L15)
- **Impact:** Hardcoded fallback strings (e.g. `"dev-secret-change-in-production"`) exist in authentication and encryption modules if environment variables are omitted. If deployed to a staging or preview environment without explicit environment key injection, signed tokens and encrypted PIN hashes can be forged or decrypted by anyone aware of the open-source defaults.
- **Recommended Fix:** Throw a fatal startup error in `server/_core/env.ts` if `JWT_SECRET`, `PIN_ENCRYPTION_KEY`, or `DEAL_HMAC_SECRET` are not set when `NODE_ENV === "production"`, preventing server initialization with weak keys.

---

## 🟠 HIGH PRIORITY

### 4. Severe Code Duplication Between Item Creation & Editing Wizards
- **Location:** [client/src/pages/CreatePost.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/pages/CreatePost.tsx) & [client/src/pages/EditPost.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/pages/EditPost.tsx)
- **Impact:** `CreatePost.tsx` (30.6 KB) and `EditPost.tsx` (31.5 KB) share ~90% identical code, duplicating the 3-step wizard workflow, drag-and-drop dropzone UI, `categoryMetadata`, `conditionMetadata`, `BANNED_KEYWORDS` validation, and the `PriceSuggestion` widget. Any fix or UI update made to one wizard must be manually ported to the other, creating high maintenance overhead and UI divergence risk.
- **Recommended Fix:** Extract the common wizard UI, form fields, and validation logic into a single reusable component `client/src/components/ItemFormWizard.tsx` shared by both pages.

### 5. Imperative Migration Script Divergence vs Drizzle Schema
- **Location:** [create_table.js](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/create_table.js) & [drizzle/schema.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/drizzle/schema.ts)
- **Impact:** Database schema changes are currently managed via a manual imperative Node.js script (`create_table.js`) containing raw SQL `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` statements alongside declarative Drizzle schemas. This creates schema drift risks where Drizzle TypeScript types mismatch actual database column definitions in production or fresh staging instances.
- **Recommended Fix:** Adopt standard Drizzle Kit migrations (`npx drizzle-kit generate` and `npx drizzle-kit push`) and remove the manual `create_table.js` script from the build workflow.

### 6. Missing Pagination on User Deal Query Endpoints
- **Location:** [server/db.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/db.ts#L450-L510) & [server/routers.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/routers.ts#L680-L710)
- **Impact:** `getDealsBySeller` and `getDealsByBuyer` fetch ALL historical deals for a user in a single database query. As active users accumulate dozens of campus transactions, loading the seller/buyer dashboard transfers bloated JSON payloads and causes unnecessary UI rendering lag.
- **Recommended Fix:** Add optional `limit` (default 20) and `cursor`/`offset` inputs to `deals.getBySeller` and `deals.getByBuyer` procedures, implementing infinite scrolling or paginated tabs.

### 7. Missing Database Indexes on High-Frequency Join Columns
- **Location:** [drizzle/schema.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/drizzle/schema.ts#L76-L105)
- **Impact:** While composite indexes exist for `items.sellerId + status`, foreign key columns `deals.itemId`, `deals.createdAt`, `reviews.dealId`, and `deal_events.dealId` lack explicit indexes in `schema.ts`. Queries performing join lookups or timeline event queries trigger sequential table scans as row counts grow.
- **Recommended Fix:** Add explicit indexes to `schema.ts`:
  - `index("deals_itemId_idx").on(table.itemId)`
  - `index("reviews_dealId_idx").on(table.dealId)`
  - `index("deal_events_dealId_idx").on(table.dealId)`

---

## 🟡 MEDIUM PRIORITY

### 8. Hardcoded Advisory Lock Key Collision Risk
- **Location:** [server/db.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/db.ts#L1272-L1275)
- **Impact:** `runDistributedGuardedCleanupJob()` hardcodes the magic integer `99887766` for PostgreSQL `pg_try_advisory_lock`. If another background worker or external tool uses PostgreSQL advisory locks on the same database without a centralized lock key allocation, lock collisions will silently block cleanup job execution.
- **Recommended Fix:** Define a centralized lock registry constant in `server/constants.ts` (e.g. `ADVISORY_LOCK_CLEANUP_JOB = 99887766`) and log lock acquisition attempts with unique instance IDs.

### 9. Unused Boilerplate Stub Files in Core Server Directory
- **Location:** `server/_core/` ([llm.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/llm.ts), [voiceTranscription.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/voiceTranscription.ts), [dataApi.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/dataApi.ts), [imageGeneration.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/imageGeneration.ts), [map.ts](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/server/_core/map.ts))
- **Impact:** Multiple small stub files (100–200 bytes each) left over from initial template scaffolds sit unused in `server/_core/`. They pollute the workspace, increase cognitive overhead for new developers, and clutter import auto-complete lists.
- **Recommended Fix:** Remove unused stub modules or group active core utilities cleanly into dedicated feature folders.

### 10. Horizontal Overflow of PIN Input Slots on Small Viewports
- **Location:** [client/src/components/dashboard/Shared.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/components/dashboard/Shared.tsx#L405-L425)
- **Impact:** On narrow mobile viewports (<360px width), the 6-digit `InputOTP` slots (`w-12 h-14`) exceed container bounds, causing the 6th PIN digit slot to wrap onto a new line or clip off-screen.
- **Recommended Fix:** Adjust slot sizing classes to `w-9 h-11 sm:w-12 sm:h-14` with `gap-1 sm:gap-2` to guarantee responsive fitting across all mobile screen dimensions.

### 11. Generic Root Error Boundary Recovery UX
- **Location:** [client/src/components/ErrorBoundary.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/components/ErrorBoundary.tsx#L15-L40)
- **Impact:** When an unhandled React rendering exception occurs, `ErrorBoundary.tsx` displays a static error card with no interactive "Reset State" or "Clear Local Storage" action. Users remain stuck on the error screen until manually refreshing the browser.
- **Recommended Fix:** Add a "Reset Application & Reload" button in `ErrorBoundary.tsx` that clears transient query cache and triggers `window.location.reload()`.

---

## 🟢 LOW PRIORITY

### 12. Missing Environment Variables in `.env.example` Template
- **Location:** [.env.example](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/.env.example) & [.env](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/.env)
- **Impact:** Environment keys added during security hardening (`REDIS_URL`, `PIN_ENCRYPTION_KEY`, `DEAL_HMAC_SECRET`, `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`) are missing from `.env.example`. New developers cloning the repo face setup friction when configuring local environments.
- **Recommended Fix:** Update `.env.example` with dummy placeholders and setup comments for all active environment variables.

### 13. Unoptimized Lucide Icon Package Imports
- **Location:** [client/src/pages/CreatePost.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/pages/CreatePost.tsx#L7-L22) & [client/src/pages/EditPost.tsx](file:///d:/PROGRAMMING/BorrowBox/borrowbox_fixed%20%281%29/borrowbox/client/src/pages/EditPost.tsx#L7-L22)
- **Impact:** Importing 15+ individual icons from `"lucide-react"` using top-level destructuring in multiple large page files increases Vite bundler analysis overhead.
- **Recommended Fix:** Consolidate icon imports or use direct path imports if bundle size optimization becomes necessary for production.
