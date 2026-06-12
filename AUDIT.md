# BorrowBox — Full Independent Audit
> Findings from a complete read of every source file. Severity: 🔴 Critical → 🟠 High → 🟡 Medium → 🔵 Low/UX

---

## 🔴 CRITICAL — Fix Before Anyone Uses This

---

### 1. The Buyer Can Mark Their Own Payment as Paid (Theft is Possible)

**Where:** `server/routers.ts` → `deals.markPaid` | `client/src/pages/BuyerConfirmation.tsx`

**What's happening:**
The `markPaid` procedure checks `ctx.user.id !== deal.buyerId` — meaning only the **buyer** can call it. The entire flow in `BuyerConfirmation.tsx` is:
1. Buyer presses "Confirm Delivery" (generates QR code on server)
2. Buyer *scans or doesn't scan* the QR
3. Buyer presses "✓ I've Completed Payment"

Step 3 immediately sets `deal.status = 'PAID'` and `item.status = 'SOLD'`. **The seller has zero say in this**. A buyer can physically take the item, come home, click the button without ever opening UPI, and the system will declare the deal "Delivered & Paid". The seller's dashboard shows ✅ — they have no item and no money.

**The Fix:**
Flip the authority. The buyer confirms *delivery*. The seller confirms *payment received*.

`server/routers.ts`:
```ts
// markPaid — change to SELLER only
if (ctx.user.id !== deal.sellerId) {
  throw new TRPCError({ code: "FORBIDDEN", message: "Only the seller can confirm payment receipt" });
}
```

`client/src/pages/Dashboard.tsx` → `DealCard` (seller's view): Add a "Confirm Payment Received" button when `deal.status === 'CONFIRMED'`.

`client/src/pages/BuyerConfirmation.tsx`: Remove the "I've Completed Payment" button. Replace it with: *"Payment QR is ready. After you pay, the seller will confirm receipt and close the deal."*

---

### 2. No Email Verification on Registration (Anyone Can Impersonate)

**Where:** `server/routers.ts` → `auth.register` | `client/src/pages/Register.tsx`

**What's happening:**
Registration checks `.endsWith("@vitstudent.ac.in")` in Zod, but immediately issues a JWT session cookie and redirects to `/marketplace`. There is **no OTP or verification link sent to the inbox**. I can type `registrar@vitstudent.ac.in` or `hod.cse@vitstudent.ac.in`, create an account, and start listing items with fake authority/credibility. I can also register emails that don't belong to me.

**The Fix:**
1. Add `isEmailVerified: int().default(0)` to `drizzle/schema.ts → users`.
2. In `auth.register`: Don't set a session cookie. Instead generate a 6-digit OTP, store it in the DB, and send it via Resend to the email. Return `{ pending: true }`.
3. Create a new `auth.verifyEmail` tRPC procedure that validates the OTP and then sets the cookie.
4. In `authenticateRequest` in `auth.ts`: Check `user.isEmailVerified === 1` alongside `isBanned`.

---

### 3. The Unverified Listing Limit is Client-Side Only (Easily Bypassed)

**Where:** `client/src/pages/CreatePost.tsx` lines 22–25, 153–158

**What's happening:**
The 1-listing limit for unverified users (`hasReachedUnverifiedLimit`) is calculated entirely in the React component using `userItems.length >= 1`. The server's `items.create` mutation has **no such check**. Any user with browser dev tools (or Postman/curl) can call `items.create` as many times as they want, bypassing the unverified-limit entirely. This is a complete anti-abuse bypass.

**The Fix:**
Add the check server-side in `items.create`:
```ts
// server/routers.ts → items.create
const user = await getUserById(ctx.user.id);
if (!user?.whatsappVerified) {
  const existingItems = await getItemsBySellerId(ctx.user.id);
  if (existingItems.length >= 1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Verify your WhatsApp number to post more than 1 listing.",
    });
  }
}
```

---

### 4. `deals.getByItem` is a Public Procedure — Exposes All Buyer IDs

**Where:** `server/routers.ts` line 554–556

**What's happening:**
```ts
getByItem: publicProcedure
  .input(z.object({ itemId: z.number() }))
  .query(async ({ input }) => await getDealsByItemId(input.itemId)),
```
This is completely public — no auth required. Anyone (logged in or not) can call `/api/trpc/deals.getByItem?input={"itemId":1}` and see a list of every buyer who expressed interest in any item, along with `buyerId`, `status`, `amount`, and the `upiQrCode` string. That's a privacy breach exposing financial data (UPI details) and user identities to the public internet.

**The Fix:**
Change to `protectedProcedure`. For sellers: show all buyers. For buyers: only show their own deal. For everyone else: forbidden.

---

## 🟠 HIGH — Scam Vectors and Data Integrity Issues

---

### 5. Chat Has No Message Length Limit or Spam Protection

**Where:** `server/routers.ts` → `messages.send` | `client/src/components/DealChat.tsx`

**What's happening:**
The `messages.send` input is `z.string().min(1)` — there is no `max()`. A malicious user can send a single message containing 10MB of text, repeatedly, filling your MySQL table and potentially crashing the server. The chat also polls every **3 seconds** unconditionally for every open dialog — on a page with 10 deals open, that's 10 simultaneous polling requests every 3 seconds.

**The Fix:**
1. Add `z.string().min(1).max(2000)` to `messages.send`.
2. Add a rate limit for messages (e.g., max 20 messages per minute per user).
3. Only poll when the chat dialog is open (move refetch logic to dialog open state).

---

### 6. No Protection Against Fake Listing Inflation (Scam Setup)

**Where:** `server/routers.ts` → `items.create`

**What's happening:**
A verified user (WhatsApp verified) has no cap on listings. A scammer can create 500 listings for "MacBook Pro - ₹1" or completely fake items, spam the marketplace, get lots of "interest" expressions, and then never follow through. There's also no maximum price validation — a listing at ₹99,99,999 is accepted by Zod.

**The Fix:**
1. Add a max active listings cap for verified users (e.g., 20).
2. Add a max price validation: `z.string().refine(val => Number(val) <= 100000, "Price cannot exceed ₹1,00,000")`.
3. Add a minimum description length requirement to avoid stub listings.

---

### 7. UPI ID is Never Validated Before QR Generation

**Where:** `server/routers.ts` → `deals.confirmDelivery` (line 636–644)

**What's happening:**
```ts
if (seller.upiId && seller.upiName) {
  const qrCode = generateUpiQrCode(seller.upiId, seller.upiName, ...);
```
The `upiId` is just whatever the seller typed in Profile. There is no validation against a known format. A seller could type `not-a-upi-id`, `javascript:alert(1)`, or a completely different person's UPI ID (routing payments to someone else). The generated `upi://pay?pa=...` string is never validated.

**The Fix:**
1. Validate UPI ID format on profile save: `z.string().regex(/^[\w.\-_]+@[\w]+$/, "Invalid UPI ID format")`.
2. Show the seller's UPI name prominently on the QR page so buyers can visually verify the recipient before paying.

---

### 8. Seller Can Delete a Listing With Active Deals

**Where:** `server/routers.ts` → `items.delete` (line 470–478)

**What's happening:**
```ts
delete: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const item = await getItemById(input.id);
    if (!item || item.sellerId !== ctx.user.id)
      throw new TRPCError({ code: "FORBIDDEN" });
    await deleteItem(input.id); // CASCADE deletes all deals!
  }),
```
If a buyer expressed interest and the seller deletes the listing, **all deals cascade-delete silently**. The buyer's dashboard will suddenly show "Item #X — Deal not found" with no explanation. They lose their deal history, their chat messages, and have no idea what happened. This is also a scam vector: a seller can delete the listing the moment they receive WhatsApp contact (outside the app) to avoid any in-app record.

**The Fix:**
Check for active, non-cancelled deals before allowing deletion:
```ts
const activeDeals = await getDealsByItemId(input.id);
const hasActive = activeDeals.some(d => !["CANCELLED", "PAID"].includes(d.status));
if (hasActive) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot delete a listing with active deals. Cancel all deals first.",
  });
}
```

---

### 9. `/api/upload` Has No Authentication Middleware

**Where:** `server/upload.ts` | `server/_core/index.ts`

**What's happening:**
The upload endpoint is registered before the tRPC middleware and has no auth check whatsoever:
```ts
app.use(uploadRouter); // no auth!
app.use("/api/trpc", createExpressMiddleware(...));
```
Any anonymous user — not even logged into BorrowBox — can POST to `/api/upload` and consume your Cloudinary quota (or disk space). A single script can exhaust the Cloudinary free tier in minutes by uploading 5MB images in a loop.

**The Fix:**
Add a JWT check to the upload endpoint:
```ts
uploadRouter.post("/api/upload", authenticateUpload, upload.single("image"), async (req, res) => { ... });

// middleware:
async function authenticateUpload(req, res, next) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  const session = token ? verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  next();
}
```

---

## 🟡 MEDIUM — UX Gaps and Design Issues

---

### 10. The "Chat In-App" Shows "Buyer #5" Instead of a Real Name

**Where:** `client/src/pages/Dashboard.tsx` line 672 | `client/src/pages/ItemDetail.tsx` line 348

**What's happening:**
```tsx
<DealChat dealId={deal.id} otherPartyName={`Buyer #${deal.buyerId || "Unknown"}`} />
// and
<DealChat dealId={deal.id} otherPartyName={`Seller #${item.sellerId}`} />
```
The chat header shows a raw database ID like "Chat with Buyer #47". This feels broken, impersonal, and unprofessional. The seller's name is already available from `sellerProfile.name` in `ItemDetail.tsx`, and buyer names are available from deal data if joined on the server.

**The Fix:**
Pass proper names. On the server side, `getDealById` should join and return `buyerName` and `sellerName`. On the frontend, use `deal.buyerName` / `sellerProfile.name`.

---

### 11. Marketplace is Completely Locked Behind Login (Kills Discovery)

**Where:** `client/src/pages/Marketplace.tsx` lines 105–118

**What's happening:**
```tsx
if (!isAuthenticated) {
  return (
    <div>
      <h2>Sign in to browse items</h2>
      <Button onClick={() => setLocation("/")}>Go to Home</Button>
    </div>
  );
}
```
The landing page literally says "Borrow. Share. Repeat." and has an "Explore Marketplace" button — but clicking it while logged out just dumps you on a wall that says "Sign in to browse items." This is a classic conversion killer. The `items.getAll` procedure is already a `publicProcedure`, meaning the backend *can* serve listings to guests.

**The Fix:**
Allow browsing without login. Only gate the "I'm Interested" button behind auth. This is how every major marketplace (eBay, OLX, Facebook Marketplace) works.

---

### 12. No "Empty State" Illustration on Marketplace

**Where:** `client/src/pages/Marketplace.tsx` lines 246–257

**What's happening:**
When no items are found (after a search with no results, for example), the page shows:
```
No items found. Try adjusting your search or filters.
[Be the first to post!]
```
Plain text. No icon, no illustration, no visual feedback that the UI is even working. This looks like a broken page to a first-time user.

**The Fix:**
Add a visual empty state with an icon, a friendlier message differentiated between "no items at all" vs "no search results", and animated entrance for the message.

---

### 13. The Deal Status Labels Are Confusing and Inconsistent

**Where:** `client/src/pages/Dashboard.tsx` lines 165–173

**What's happening:**
```ts
const statusLabels = {
  OPEN: "Open",
  Shipped: "Finalized",  // ← "Shipped" maps to "Finalized"?? 
  DELIVERED: "Delivered",
  CONFIRMED: "Confirmed",
  PAID: "Delivered & Paid",
  CANCELLED: "Cancelled",
};
```
- `Shipped` is labeled "Finalized" in the dashboard but "Finalized" in the progress flow buttons. It's not clear to either party what "Finalized" means in the context of a college P2P transaction — there's no actual shipping involved, items are handed over in person.
- In `ItemDetail.tsx` the status `DELIVERED` renders as "Sold" (line 247: `item.status !== "OPEN" ? "Sold" : "Available"`), which is wrong for an item in "DELIVERED" state — it's not sold yet.

**The Fix:**
Rename `Shipped` → `Finalized` consistently in the DB enum (or just rename the concept to "Meetup Scheduled"). Fix the item badge to differentiate between statuses (`Available` / `In Progress` / `Sold`) rather than a binary.

---

### 14. Password Reset Doesn't Invalidate Old Sessions

**Where:** `server/routers.ts` → `auth.resetPassword` lines 203–225

**What's happening:**
After a successful password reset:
```ts
const passwordHash = await hashPassword(input.password);
await updateUserPassword(user.id, passwordHash);
return { success: true };
```
The `tokenVersion` is **not incremented**. If a bad actor stole someone's session cookie and the victim resets their password to lock them out, the attacker's JWT is still valid for up to 7 days. The password reset should force-logout all existing sessions.

**The Fix:**
```ts
await updateUserPassword(user.id, passwordHash);
await incrementUserTokenVersion(user.id); // ← add this
```

---

### 15. `/admin` Route Has No Client-Side Guard

**Where:** `client/src/App.tsx` line 39

**What's happening:**
```tsx
<Route path="/admin" component={AdminDashboard} />
```
There's no `ProtectedAdminRoute` wrapper. Any logged-out user navigating to `/admin` will be served the `AdminDashboard` component, which will just show loading spinners forever or empty states. While the server-side `adminProcedure` correctly validates the role, the client-side component doesn't redirect non-admins away cleanly — it creates a confusing blank experience.

**The Fix:**
Create a `ProtectedAdminRoute` component:
```tsx
function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) { setLocation("/login"); return null; }
  if (user?.role !== "admin") { setLocation("/"); return null; }
  return <Component />;
}
```

---

## 🔵 LOW / POLISH

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 16 | `ENV.cookieSecret` falls back to `"dev-secret-change-in-production"` — if someone forgets to set `JWT_SECRET`, prod runs with a known secret | `server/_core/env.ts` | Throw a hard error if `JWT_SECRET` is missing in production |
| 17 | `express.json({ limit: "50mb" })` is way too large — a 50MB JSON body DoS is trivial | `server/_core/index.ts` | Reduce to `"1mb"` for API, keep high only for the upload endpoint |
| 18 | Chat polls every 3 seconds regardless of whether the dialog is open — this means every open Dashboard tab is making network requests continuously | `DealChat.tsx` line 22 | Use `enabled: isDialogOpen` prop + WebSocket long-term |
| 19 | `items.delete` has no check for items with active/confirmed deals — deleting silently cascade-deletes all deal records and messages | `routers.ts` → `items.delete` | Block deletion if active deal exists |
| 20 | The `"Buyer #47"` display in chat is inconsistent — the seller knows the buyer's name from their WhatsApp conversation but the app shows an ID | `DealChat.tsx` | Resolve name from deal join |
| 21 | No `<title>` or `<meta description>` tags on any page — bad for SEO and sharing links | All pages | Add `<Helmet>` or native meta tags |
| 22 | The Home page has "Connect via WhatsApp" as Step 2 in "How It Works" — this actively promotes bypassing the in-app deal flow, undermining all scam protection | `Home.tsx` line 200 | Rewrite as "Express Interest" using the app flow |
| 23 | No `loading` spinner or disabled state after clicking "I'm Interested" button in `ItemDetail.tsx` if the deal mutation is slow | `ItemDetail.tsx` line 356 | `disabled={createDealMutation.isPending}` already exists ✅ but the button text doesn't change | 
| 24 | `deals.getById` is a `publicProcedure` — anyone can fetch any deal by ID including `upiQrCode` data | `routers.ts` line 550 | Change to `protectedProcedure`, verify `buyerId` or `sellerId` |

---

## Summary Table

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 4 | Payment spoofing, no email verification, listing limit bypass, public deal data |
| 🟠 High | 5 | Chat spam, fake listings, UPI validation, item deletion with deals, unauthenticated uploads |
| 🟡 Medium | 5 | Chat names, marketplace gate, empty states, confusing labels, password reset sessions |
| 🔵 Low | 9 | Env secrets, JSON limit, chat polling, SEO, WhatsApp flow promotion |

**Total: 23 distinct findings across security, scam prevention, UX, and design.**
