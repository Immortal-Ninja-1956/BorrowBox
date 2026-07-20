import { eq, desc, and, or, sql, like, asc, lt, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, items, deals, reviews, messages, item_reports, revoked_tokens } from "../drizzle/schema";
import type {
  InsertUser,
  InsertReview,
  InsertMessage,
  InsertItemReport,
} from "../drizzle/schema";
import crypto from "crypto";


let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const isLocal = process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1");
      const client = postgres(process.env.DATABASE_URL, { 
        prepare: false, 
        ssl: isLocal ? undefined : "require",
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
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
      passwordHash: "DELETED",
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
  const result = await db.insert(items).values({
    sellerId: data.sellerId,
    title: data.title,
    description: data.description,
    amount: data.amount as any,
    imageUrl: data.imageUrl,
    category: data.category,
    condition: data.condition as any,
  }).returning({ insertId: items.id });
  return result[0].insertId;
}

export async function getItemById(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getItemsBySellerId(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(items).where(eq(items.sellerId, sellerId));
}

export async function getAllItems() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(items);
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

  const conditions: any[] = [eq(items.status, "OPEN")];

  if (options.category && options.category !== "all") {
    conditions.push(eq(items.category, options.category));
  }

  if (options.sellerId !== undefined) {
    conditions.push(eq(items.sellerId, options.sellerId));
  }

  if (options.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(items.title, searchPattern),
        like(items.description, searchPattern)
      )
    );
  }

  let query = db
    .select()
    .from(items)
    .where(and(...conditions));

  if (options.sortBy === "price-low") {
    query = query.orderBy(asc(items.amount)) as any;
  } else if (options.sortBy === "price-high") {
    query = query.orderBy(desc(items.amount)) as any;
  } else if (options.sortBy === "oldest") {
    query = query.orderBy(asc(items.createdAt)) as any;
  } else {
    // Default to newest first
    query = query.orderBy(desc(items.createdAt)) as any;
  }

  return await query.limit(options.limit).offset(options.offset);
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
  if (data.amount !== undefined) updateData.amount = data.amount;
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
  return await db.delete(items).where(eq(items.id, itemId));
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
  const result = await db.insert(deals).values({
    itemId: data.itemId,
    sellerId: data.sellerId,
    buyerId: data.buyerId,
    amount: data.amount as any,
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

export async function setDealDisputed(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({
      status: "DISPUTED" as any,
      disputedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
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
export async function completeDealAtomically(dealId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Use Drizzle's transaction support
  await db.transaction(async (tx) => {
    await tx
      .update(deals)
      .set({ status: "PAID" as any })
      .where(eq(deals.id, dealId));
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

export async function updateDealStatus(dealId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ status: status as any })
    .where(eq(deals.id, dealId));
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

export async function confirmDeliveryAtomically(dealId: number, qrCode: string | undefined) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const data: any = {
    buyerConfirmed: 1,
    status: "CONFIRMED" as any,
  };
  if (qrCode !== undefined) {
    data.upiQrCode = qrCode;
  }
  return await db
    .update(deals)
    .set(data)
    .where(eq(deals.id, dealId));
}

export async function advanceDealStatusAtomically(dealId: number, itemId: number, newStatus: string) {
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

    await tx.update(deals).set({ status: newStatus as any }).where(eq(deals.id, dealId));

    if (newStatus === "Shipped" || newStatus === "DELIVERED") {
      await tx.update(items).set({ status: newStatus as any }).where(eq(items.id, itemId));
      await tx.update(deals)
        .set({ status: "CANCELLED" as any })
        .where(and(eq(deals.itemId, itemId), ne(deals.id, dealId)));
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

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId));
}

export async function incrementUserTokenVersion(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
}

// Reviews

export async function createReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reviews).values(review).returning({ insertId: reviews.id });
  return result.insertId;
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

  return {
    averageRating: result[0]?.averageRating
      ? Number(result[0].averageRating).toFixed(1)
      : "0.0",
    totalReviews: Number(result[0]?.totalReviews || 0),
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
