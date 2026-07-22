import { eq, desc, and, or, sql, like, asc, lt, ne, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, items, deals, reviews, messages, item_reports, revoked_tokens, admin_actions, item_rejections, image_vision_cache, deal_events } from "../drizzle/schema";
import type {
  InsertUser,
  InsertReview,
  InsertMessage,
  InsertItemReport,
  InsertAdminAction,
  InsertItemRejection,
  InsertImageVisionCache,
  InsertDealEvent,
} from "../drizzle/schema";
import crypto from "crypto";
import { parseCurrencyAmount } from "../shared/currency";


let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPromise: Promise<ReturnType<typeof drizzle> | null> | null = null;

export async function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) return null;

  if (!_connectionPromise) {
    _connectionPromise = (async () => {
      const isLocal = process.env.DATABASE_URL!.includes("localhost") || process.env.DATABASE_URL!.includes("127.0.0.1");
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          const client = postgres(process.env.DATABASE_URL!, { 
            prepare: false, 
            ssl: isLocal ? undefined : "require",
          });
          // Verify connection
          await client`SELECT 1`;
          _db = drizzle(client);
          return _db;
        } catch (error) {
          attempt++;
          console.warn(`[Database] Failed to connect (Attempt ${attempt}/${maxRetries}):`, error);
          if (attempt >= maxRetries) {
            _connectionPromise = null;
            throw new Error(`Database connection failed after ${maxRetries} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      return null;
    })();
  }

  return _connectionPromise;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  name: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    email: data.email,
    name: data.name,
  }).returning({ insertId: users.id });
  return result[0].insertId;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUsersByIds(userIds: number[]) {
  if (userIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function updateUserProfile(
  userId: number,
  data: {
    upiId?: string;
    upiName?: string;
    whatsapp?: string;
    whatsappVerified?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = {};
  if (data.upiId !== undefined) updateData.upiId = data.upiId;
  if (data.upiName !== undefined) updateData.upiName = data.upiName;
  if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
  if (data.whatsappVerified !== undefined)
    updateData.whatsappVerified = data.whatsappVerified;
  return await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserWhatsAppOtp(
  userId: number,
  otp: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Store a SHA-256 hash — the raw OTP never touches the database
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  return await db
    .update(users)
    .set({ whatsappOtp: otpHash, whatsappOtpExpiresAt: expiresAt })
    .where(eq(users.id, userId));
}

export async function verifyUserWhatsApp(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ whatsappVerified: 1, whatsappOtp: null, whatsappOtpExpiresAt: null })
    .where(eq(users.id, userId));
}

export async function anonymizeUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({
      email: `deleted_user_${userId}@deleted.invalid`,
      name: "Deleted User",
      upiId: null,
      upiName: null,
      whatsapp: null,
      whatsappVerified: 0,
      whatsappOtp: null,
      whatsappOtpExpiresAt: null,
      emailOtp: null,
      emailOtpExpiresAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      isBanned: 1,
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId));
}

export async function updateUserEmailOtp(
  userId: number,
  otp: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ emailOtp: otp, emailOtpExpiresAt: expiresAt })
    .where(eq(users.id, userId));
}

export async function verifyUserEmail(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ isEmailVerified: 1, emailOtp: null, emailOtpExpiresAt: null })
    .where(eq(users.id, userId));
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function createItem(data: {
  sellerId: number;
  title: string;
  description?: string;
  amount: string;
  imageUrl?: string;
  category?: string;
  condition?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const formattedAmount = parseCurrencyAmount(data.amount);
  const result = await db.insert(items).values({
    sellerId: data.sellerId,
    title: data.title,
    description: data.description,
    amount: formattedAmount as any,
    imageUrl: data.imageUrl,
    category: data.category,
    condition: data.condition as any,
  }).returning({ insertId: items.id });
  return result[0].insertId;
}

export async function getItemById(itemId: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(items.id, itemId)];
  if (!includeDeleted) {
    conditions.push(isNull(items.deletedAt));
  }
  const result = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getItemsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(items)
    .where(and(eq(items.sellerId, sellerId), isNull(items.deletedAt)));
}



export async function getPagedItems(options: {
  limit: number;
  offset: number;
  search?: string;
  category?: string;
  sellerId?: number;
  sortBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [eq(items.status, "OPEN"), isNull(items.deletedAt)];

  if (options.category && options.category !== "all") {
    conditions.push(eq(items.category, options.category));
  }

  if (options.sellerId !== undefined) {
    conditions.push(eq(items.sellerId, options.sellerId));
  }

  if (options.search) {
    conditions.push(
      sql`to_tsvector('english', ${items.title} || ' ' || coalesce(${items.description}, '')) @@ plainto_tsquery('english', ${options.search})`
    );
  }

  const sellers = aliasedTable(users, "sellers");

  let query = db
    .select({
      item: items,
      sellerName: sellers.name,
      sellerEmail: sellers.email,
      sellerTrustScore: sellers.trustScore,
      sellerWhatsappVerified: sellers.whatsappVerified,
      sellerRole: sellers.role,
    })
    .from(items)
    .innerJoin(sellers, eq(items.sellerId, sellers.id))
    .where(and(...conditions));

  if (options.sortBy === "price-low") {
    query = query.orderBy(asc(sql`${items.amount}::numeric`)) as any;
  } else if (options.sortBy === "price-high") {
    query = query.orderBy(desc(sql`${items.amount}::numeric`)) as any;
  } else if (options.sortBy === "oldest") {
    query = query.orderBy(asc(items.createdAt)) as any;
  } else {
    // Default to newest first
    query = query.orderBy(desc(items.createdAt)) as any;
  }

  const results = await query.limit(options.limit).offset(options.offset);
  return results.map(r => ({
    ...r.item,
    sellerName: r.sellerName,
    sellerEmail: r.sellerEmail,
    sellerTrustScore: r.sellerTrustScore,
    sellerWhatsappVerified: r.sellerWhatsappVerified,
    sellerRole: r.sellerRole,
  }));
}

export async function updateItem(
  itemId: number,
  data: {
    title?: string;
    description?: string;
    amount?: string;
    imageUrl?: string;
    category?: string;
    condition?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = parseCurrencyAmount(data.amount);
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (Object.keys(updateData).length === 0) return;
  return await db.update(items).set(updateData).where(eq(items.id, itemId));
}

export async function updateItemStatus(itemId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(items)
    .set({ status: status as any })
    .where(eq(items.id, itemId));
}

export async function deleteItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(items)
    .set({ deletedAt: new Date() })
    .where(eq(items.id, itemId));
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function expireOldDeals() {
  const db = await getDb();
  if (!db) return;

  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. OPEN deals idle for 72h — cancel if NOT frozen, else NEEDS_ATTENTION
  //    Freeze condition: pinViewedAt set, pinAttempts > 0, utr present, or DISPUTED
  //    (DISPUTED status is excluded from OPEN query anyway, but guard for safety)

  // Cancel unfrozen OPEN deals older than 72h
  await db
    .update(deals)
    .set({ status: "CANCELLED" as any })
    .where(
      and(
        eq(deals.status, "OPEN"),
        lt(deals.createdAt, seventyTwoHoursAgo),
        sql`${deals.pinViewedAt} IS NULL`,
        eq(deals.pinAttempts, 0),
        sql`${deals.utr} IS NULL`
      )
    );

  // Move frozen OPEN deals older than 72h to NEEDS_ATTENTION
  await db
    .update(deals)
    .set({ status: "NEEDS_ATTENTION" as any })
    .where(
      and(
        eq(deals.status, "OPEN"),
        lt(deals.createdAt, seventyTwoHoursAgo),
        or(
          sql`${deals.pinViewedAt} IS NOT NULL`,
          sql`${deals.pinAttempts} > 0`,
          sql`${deals.utr} IS NOT NULL`
        )
      )
    );

  // 2. Contacted/Shipped deals idle for 7 days
  for (const status of ["Contacted", "Shipped"] as const) {
    // Cancel unfrozen
    await db
      .update(deals)
      .set({ status: "CANCELLED" as any })
      .where(
        and(
          eq(deals.status, status),
          lt(deals.updatedAt, sevenDaysAgo),
          sql`${deals.pinViewedAt} IS NULL`,
          eq(deals.pinAttempts, 0),
          sql`${deals.utr} IS NULL`
        )
      );

    // Move frozen to NEEDS_ATTENTION
    await db
      .update(deals)
      .set({ status: "NEEDS_ATTENTION" as any })
      .where(
        and(
          eq(deals.status, status),
          lt(deals.updatedAt, sevenDaysAgo),
          or(
            sql`${deals.pinViewedAt} IS NOT NULL`,
            sql`${deals.pinAttempts} > 0`,
            sql`${deals.utr} IS NOT NULL`
          )
        )
      );
  }

  // Cleanup expired revoked tokens
  await db.delete(revoked_tokens).where(lt(revoked_tokens.expiresAt, new Date()));
}

export async function cancelOtherDeals(itemId: number, activeDealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ status: "CANCELLED" as any })
    .where(
      and(
        eq(deals.itemId, itemId),
        ne(deals.id, activeDealId),
        eq(deals.status, "OPEN")
      )
    );
}

export async function createDeal(data: {
  itemId: number;
  sellerId: number;
  buyerId?: number;
  amount: string;
  pinHash?: string;
  pinEncrypted?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const formattedAmount = parseCurrencyAmount(data.amount);
  const result = await db.insert(deals).values({
    itemId: data.itemId,
    sellerId: data.sellerId,
    buyerId: data.buyerId,
    amount: formattedAmount as any,
    status: "OPEN",
    pinHash: data.pinHash,
    pinEncrypted: data.pinEncrypted,
  }).returning({ insertId: deals.id });
  return result[0].insertId;
}

export async function updateDealPinData(
  dealId: number,
  data: {
    pinHash: string;
    pinEncrypted: string;
    pinAttempts?: number;
    pinLockedAt?: Date | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({
      pinHash: data.pinHash,
      pinEncrypted: data.pinEncrypted,
      pinAttempts: data.pinAttempts ?? 0,
      pinLockedAt: data.pinLockedAt ?? null,
    })
    .where(eq(deals.id, dealId));
}

export async function setDealPinViewed(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ pinViewedAt: new Date() })
    .where(eq(deals.id, dealId));
}

export async function incrementPinAttempts(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ pinAttempts: sql`${deals.pinAttempts} + 1` })
    .where(eq(deals.id, dealId));
}

export async function lockDealPin(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ pinLockedAt: new Date() })
    .where(eq(deals.id, dealId));
}

export async function setDealUtr(dealId: number, utr: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ utr, utrSubmittedAt: new Date() })
    .where(eq(deals.id, dealId));
}

export async function isDuplicateUtr(utr: string, excludeDealId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(deals)
    .where(and(eq(deals.utr, utr), ne(deals.id, excludeDealId)))
    .limit(1);
  return result.length > 0;
}

export const LEGAL_DEAL_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["Contacted", "Shipped", "DELIVERED", "CONFIRMED", "PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"],
  Contacted: ["Shipped", "DELIVERED", "CONFIRMED", "PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"],
  Shipped: ["DELIVERED", "CONFIRMED", "PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"],
  CONFIRMED: ["DELIVERED", "PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"],
  DELIVERED: ["PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"],
  NEEDS_ATTENTION: ["OPEN", "Contacted", "Shipped", "CONFIRMED", "DELIVERED", "PAID", "CANCELLED", "DISPUTED"],
  DISPUTED: ["OPEN", "Contacted", "Shipped", "CONFIRMED", "DELIVERED", "PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export function isValidDealTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = LEGAL_DEAL_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

export async function transitionDealStatusAtomically(
  dealId: number,
  newStatus: string,
  actorId?: number | null,
  reason?: string | null,
  externalTx?: any
) {
  const executeInTx = async (tx: any) => {
    const [currentDeal] = await tx
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!currentDeal) throw new Error("Deal not found");
    const fromStatus = currentDeal.status;

    if (!isValidDealTransition(fromStatus, newStatus)) {
      throw new Error(`Invalid deal status transition from ${fromStatus} to ${newStatus}`);
    }

    if (fromStatus !== newStatus) {
      await tx.update(deals).set({ status: newStatus as any }).where(eq(deals.id, dealId));
      await tx.insert(deal_events).values({
        dealId,
        fromStatus,
        toStatus: newStatus,
        actorId: actorId || null,
        reason: reason || null,
      });
    }

    return currentDeal;
  };

  if (externalTx) {
    return await executeInTx(externalTx);
  } else {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.transaction(executeInTx);
  }
}

export async function setDealDisputed(dealId: number, actorId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    const [dealRecord] = await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!dealRecord) throw new Error("Deal not found");
    if ((dealRecord.disputeCount || 0) >= 3) {
      throw new Error("Dispute limit reached for this deal (maximum 3 disputes allowed). Please contact support for manual resolution.");
    }

    await transitionDealStatusAtomically(dealId, "DISPUTED", actorId, "Dispute raised", tx);
    await tx.update(deals).set({
      disputedAt: new Date(),
      disputeCount: sql`${deals.disputeCount} + 1`,
    }).where(eq(deals.id, dealId));
  });
}

export async function getDealRawById(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Atomically complete a deal: set deal → PAID and item → SOLD in a single transaction.
 * Uses raw SQL to ensure all-or-nothing semantics.
 */
export async function completeDealAtomically(dealId: number, itemId: number, actorId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    await transitionDealStatusAtomically(dealId, "PAID", actorId, "Deal payment completed", tx);
    await tx
      .update(items)
      .set({ status: "SOLD" as any })
      .where(eq(items.id, itemId));
  });
}

export async function getDealById(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({
      deal: deals,
      item: items,
    })
    .from(deals)
    .innerJoin(items, eq(deals.itemId, items.id))
    .where(eq(deals.id, dealId))
    .limit(1);
  return result.length > 0 ? { ...result[0].deal, item: result[0].item } : null;
}

export async function getDealsByItemId(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(deals).where(eq(deals.itemId, itemId));
}

export async function getDealsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select({
      deal: deals,
      item: items,
    })
    .from(deals)
    .innerJoin(items, eq(deals.itemId, items.id))
    .where(eq(deals.sellerId, sellerId));
  return results.map(r => ({
    ...r.deal,
    item: r.item,
  }));
}

export async function getDealsByBuyerId(buyerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db
    .select({
      deal: deals,
      item: items,
    })
    .from(deals)
    .innerJoin(items, eq(deals.itemId, items.id))
    .where(eq(deals.buyerId, buyerId));
  return results.map(r => ({
    ...r.deal,
    item: r.item,
  }));
}

export async function updateDealStatus(dealId: number, status: string, actorId?: number, reason?: string) {
  return await transitionDealStatusAtomically(dealId, status, actorId, reason);
}

export async function confirmDealByBuyer(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ buyerConfirmed: 1 })
    .where(eq(deals.id, dealId));
}

export async function updateDealUpiQrCode(dealId: number, qrCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ upiQrCode: qrCode })
    .where(eq(deals.id, dealId));
}

export async function confirmDeliveryAtomically(dealId: number, qrCode: string | undefined, actorId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    await transitionDealStatusAtomically(dealId, "CONFIRMED", actorId, "Delivery confirmed by buyer", tx);
    const data: any = { buyerConfirmed: 1 };
    if (qrCode !== undefined) data.upiQrCode = qrCode;
    await tx.update(deals).set(data).where(eq(deals.id, dealId));
  });
}

export async function advanceDealStatusAtomically(dealId: number, itemId: number, newStatus: string, actorId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    if (newStatus === "Shipped" || newStatus === "DELIVERED") {
      const otherDeals = await tx.select().from(deals).where(eq(deals.itemId, itemId));
      const hasActiveDeal = otherDeals.some(
        d =>
          d.id !== dealId &&
          ["Shipped", "DELIVERED", "CONFIRMED", "PAID"].includes(d.status)
      );
      if (hasActiveDeal) {
        throw new Error("ANOTHER_ACTIVE_DEAL");
      }
    }

    await transitionDealStatusAtomically(dealId, newStatus, actorId, `Advanced status to ${newStatus}`, tx);

    if (newStatus === "Shipped" || newStatus === "DELIVERED") {
      await tx.update(items).set({ status: newStatus as any }).where(eq(items.id, itemId));
      // Cancel other OPEN deals on the same item
      const openDealsToCancel = await tx
        .select()
        .from(deals)
        .where(and(eq(deals.itemId, itemId), ne(deals.id, dealId), eq(deals.status, "OPEN")));
      for (const d of openDealsToCancel) {
        await transitionDealStatusAtomically(d.id, "CANCELLED", actorId, "Auto-cancelled due to another deal progressing", tx);
      }
    }
  });
}

export async function updateUserResetToken(
  email: string,
  token: string | null,
  expiresAt: Date | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let tokenHash = null;
  if (token) {
    tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  }

  return await db
    .update(users)
    .set({ resetToken: tokenHash, resetTokenExpiresAt: expiresAt })
    .where(eq(users.email, email));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const result = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, tokenHash))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}



export async function incrementUserTokenVersion(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
}

export async function recomputeUserTrustScore(userId: number, externalTx?: any) {
  const executeInTx = async (tx: any) => {
    const result = await tx
      .select({
        avgRating: sql<number>`avg(${reviews.rating})`,
        count: sql<number>`count(${reviews.id})`,
      })
      .from(reviews)
      .where(eq(reviews.revieweeId, userId));

    const totalReviews = Number(result[0]?.count || 0);
    const calculatedScore = totalReviews > 0 && result[0]?.avgRating !== null
      ? Number(result[0].avgRating).toFixed(2)
      : "5.00";

    await tx
      .update(users)
      .set({ trustScore: calculatedScore })
      .where(eq(users.id, userId));

    return calculatedScore;
  };

  if (externalTx) {
    return await executeInTx(externalTx);
  } else {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.transaction(executeInTx);
  }
}

export async function recomputeAllUserTrustScores() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const allUsers = await db.select({ id: users.id }).from(users);
  let updatedCount = 0;
  for (const u of allUsers) {
    await recomputeUserTrustScore(u.id);
    updatedCount++;
  }
  return updatedCount;
}

export async function createReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.transaction(async (tx) => {
    const [result] = await tx.insert(reviews).values(review).returning({ insertId: reviews.id });
    await recomputeUserTrustScore(review.revieweeId, tx);
    return result.insertId;
  });
}

export async function getReviewsByDealId(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(reviews).where(eq(reviews.dealId, dealId));
}

export async function getUserReviews(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.revieweeId, userId))
    .orderBy(desc(reviews.createdAt));
}

export async function getUserTrustScore(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({
      averageRating: sql<number>`avg(${reviews.rating})`,
      totalReviews: sql<number>`count(${reviews.id})`,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

  const userRecord = await db
    .select({ trustScore: users.trustScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    averageRating: result[0]?.averageRating
      ? Number(result[0].averageRating).toFixed(1)
      : "0.0",
    totalReviews: Number(result[0]?.totalReviews || 0),
    trustScore: userRecord[0]?.trustScore || "5.00",
  };
}

// Messages

export async function getMessagesByDealId(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(messages)
    .where(eq(messages.dealId, dealId))
    .orderBy(asc(messages.createdAt));
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data).returning({ insertId: messages.id });
  return result[0].insertId;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllUsersAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isBanned: users.isBanned,
      createdAt: users.createdAt,
      whatsappVerified: users.whatsappVerified,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function updateUserBanStatus(userId: number, isBanned: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ isBanned }).where(eq(users.id, userId));
}

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const [itemCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(items);
  const [dealCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deals);

  return {
    totalUsers: Number(userCount?.count || 0),
    totalItems: Number(itemCount?.count || 0),
    totalDeals: Number(dealCount?.count || 0),
  };
}

import { aliasedTable } from "drizzle-orm";

// ─── Reports ────────────────────────────────────────────────────────────────────

export async function createItemReport(data: InsertItemReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(item_reports).values(data).returning({ insertId: item_reports.id });
  return result[0].insertId;
}

export async function getAllItemReportsAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const reporters = aliasedTable(users, "reporters");
  const sellers = aliasedTable(users, "sellers");

  return await db
    .select({
      id: item_reports.id,
      itemId: item_reports.itemId,
      reporterId: item_reports.reporterId,
      reason: item_reports.reason,
      description: item_reports.description,
      status: item_reports.status,
      createdAt: item_reports.createdAt,
      reporterName: reporters.name,
      reporterEmail: reporters.email,
      itemTitle: items.title,
      sellerId: items.sellerId,
      sellerName: sellers.name,
      sellerEmail: sellers.email,
      sellerBanned: sellers.isBanned,
      sellerRole: sellers.role,
    })
    .from(item_reports)
    .innerJoin(reporters, eq(item_reports.reporterId, reporters.id))
    .innerJoin(items, eq(item_reports.itemId, items.id))
    .innerJoin(sellers, eq(items.sellerId, sellers.id))
    .orderBy(desc(item_reports.createdAt));
}

export async function updateItemReportStatus(
  reportId: number,
  status: "OPEN" | "RESOLVED" | "DISMISSED"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(item_reports)
    .set({ status })
    .where(eq(item_reports.id, reportId));
}

// ─── Token Revocation ────────────────────────────────────────────────────────

export async function revokeToken(tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Clean up any already-expired tokens concurrently to keep DB clean
  try {
    await db.delete(revoked_tokens).where(lt(revoked_tokens.expiresAt, new Date()));
  } catch (err) {
    console.error("[Database] Error cleaning up expired tokens:", err);
  }

  return await db.insert(revoked_tokens).values({
    tokenHash,
    expiresAt,
  }).onConflictDoNothing();
}

export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(revoked_tokens)
    .where(eq(revoked_tokens.tokenHash, tokenHash))
    .limit(1);

  return result.length > 0;
}

// ─── Admin Audit Trail ────────────────────────────────────────────────────────

export async function logAdminAction(data: InsertAdminAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db
    .insert(admin_actions)
    .values(data)
    .returning({ insertId: admin_actions.id });
  return result.insertId;
}

export async function getAdminActions(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const admins = aliasedTable(users, "admins");

  return await db
    .select({
      id: admin_actions.id,
      adminId: admin_actions.adminId,
      action: admin_actions.action,
      targetId: admin_actions.targetId,
      details: admin_actions.details,
      timestamp: admin_actions.timestamp,
      adminName: admins.name,
      adminEmail: admins.email,
    })
    .from(admin_actions)
    .innerJoin(admins, eq(admin_actions.adminId, admins.id))
    .orderBy(desc(admin_actions.timestamp))
    .limit(limit);
}

// ─── Rejection Review Queue ──────────────────────────────────────────────────

export async function createItemRejection(data: InsertItemRejection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db
    .insert(item_rejections)
    .values(data)
    .returning({ insertId: item_rejections.id });
  return result.insertId;
}

export async function getAllItemRejectionsAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sellers = aliasedTable(users, "sellers");

  return await db
    .select({
      id: item_rejections.id,
      userId: item_rejections.userId,
      title: item_rejections.title,
      description: item_rejections.description,
      imageUrl: item_rejections.imageUrl,
      reason: item_rejections.reason,
      confidenceScores: item_rejections.confidenceScores,
      status: item_rejections.status,
      createdAt: item_rejections.createdAt,
      updatedAt: item_rejections.updatedAt,
      sellerName: sellers.name,
      sellerEmail: sellers.email,
    })
    .from(item_rejections)
    .innerJoin(sellers, eq(item_rejections.userId, sellers.id))
    .orderBy(desc(item_rejections.createdAt));
}

export async function updateItemRejectionStatus(
  rejectionId: number,
  status: "PENDING" | "APPROVED" | "DISMISSED"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(item_rejections)
    .set({ status })
    .where(eq(item_rejections.id, rejectionId));
}

export async function approveRejectionAndCreateItem(rejectionId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [rejection] = await tx
      .select()
      .from(item_rejections)
      .where(eq(item_rejections.id, rejectionId))
      .limit(1);

    if (!rejection) throw new Error("Rejection record not found");
    if (rejection.status === "APPROVED") throw new Error("Rejection already approved");

    // 1. Create item in marketplace
    const [newItem] = await tx
      .insert(items)
      .values({
        sellerId: rejection.userId,
        title: rejection.title,
        description: rejection.description,
        amount: "0.00", // default/placeholder amount if unspecified
        imageUrl: rejection.imageUrl,
        condition: "Good",
        status: "OPEN",
      })
      .returning({ insertId: items.id });

    // 2. Mark rejection status as APPROVED
    await tx
      .update(item_rejections)
      .set({ status: "APPROVED" })
      .where(eq(item_rejections.id, rejectionId));

    // 3. Log admin action
    await tx.insert(admin_actions).values({
      adminId,
      action: "APPROVE_REJECTED_ITEM",
      targetId: newItem.insertId,
      details: `Approved false rejection ID ${rejectionId} for seller ID ${rejection.userId}`,
    });

    return newItem.insertId;
  });
}

// ─── Image Vision Cache (GCV Deduplication) ──────────────────────────────────

export async function getVisionCacheByHash(imageHash: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(image_vision_cache)
    .where(eq(image_vision_cache.imageHash, imageHash))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function saveVisionCacheByHash(data: InsertImageVisionCache) {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(image_vision_cache)
      .values(data)
      .onConflictDoNothing();
  } catch (err) {
    console.error("[Database] Error saving vision cache:", err);
  }
}

// ─── Deal Events (Dispute Forensics) ──────────────────────────────────────────

export async function getDealEventsByDealId(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const actors = aliasedTable(users, "actors");

  return await db
    .select({
      id: deal_events.id,
      dealId: deal_events.dealId,
      fromStatus: deal_events.fromStatus,
      toStatus: deal_events.toStatus,
      actorId: deal_events.actorId,
      reason: deal_events.reason,
      timestamp: deal_events.timestamp,
      actorName: actors.name,
      actorEmail: actors.email,
    })
    .from(deal_events)
    .leftJoin(actors, eq(deal_events.actorId, actors.id))
    .where(eq(deal_events.dealId, dealId))
    .orderBy(asc(deal_events.timestamp));
}

export async function getAllDealEventsAdmin(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const actors = aliasedTable(users, "actors");

  return await db
    .select({
      id: deal_events.id,
      dealId: deal_events.dealId,
      fromStatus: deal_events.fromStatus,
      toStatus: deal_events.toStatus,
      actorId: deal_events.actorId,
      reason: deal_events.reason,
      timestamp: deal_events.timestamp,
      actorName: actors.name,
      actorEmail: actors.email,
    })
    .from(deal_events)
    .leftJoin(actors, eq(deal_events.actorId, actors.id))
    .orderBy(desc(deal_events.timestamp))
    .limit(limit);
}

// ─── Distributed Advisory Lock Guarded Scheduler ─────────────────────────────

export async function runDistributedGuardedCleanupJob(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const LOCK_KEY = 99887766; // Unique 64-bit advisory lock key for BorrowBox cleanup job
  try {
    const [lockResult] = await db.execute(sql`SELECT pg_try_advisory_lock(${LOCK_KEY}) as acquired`);
    const acquired = lockResult?.acquired === true || lockResult?.acquired === "true" || lockResult?.acquired === 1;

    if (!acquired) {
      console.log("[Distributed Scheduler] Lock key 99887766 held by another instance — skipping redundant execution.");
      return false;
    }

    try {
      console.log("[Distributed Scheduler] Acquired advisory lock 99887766 — executing expireOldDeals...");
      await expireOldDeals();
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY})`);
      console.log("[Distributed Scheduler] Released advisory lock 99887766.");
    }
    return true;
  } catch (err) {
    console.error("[Distributed Scheduler] Error during cleanup job execution:", err);
    return false;
  }
}



