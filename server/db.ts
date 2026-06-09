import { eq, desc, and, or, sql, like, asc, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, items, deals, reviews, messages } from "../drizzle/schema";
import type { InsertUser, InsertReview, InsertMessage } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
  });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return insertId as number;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: {
  upiId?: string;
  upiName?: string;
  whatsapp?: string;
  whatsappVerified?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = {};
  if (data.upiId !== undefined) updateData.upiId = data.upiId;
  if (data.upiName !== undefined) updateData.upiName = data.upiName;
  if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
  if (data.whatsappVerified !== undefined) updateData.whatsappVerified = data.whatsappVerified;
  return await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserWhatsAppOtp(userId: number, otp: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ whatsappOtp: otp, whatsappOtpExpiresAt: expiresAt }).where(eq(users.id, userId));
}

export async function verifyUserWhatsApp(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ whatsappVerified: 1, whatsappOtp: null, whatsappOtpExpiresAt: null }).where(eq(users.id, userId));
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function createItem(data: {
  sellerId: number;
  title: string;
  description?: string;
  amount: string;
  imageUrl?: string;
  category?: string;
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
  });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return insertId as number;
}

export async function getItemById(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
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

  let query = db.select().from(items).where(and(...conditions));

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

export async function updateItem(itemId: number, data: {
  title?: string;
  description?: string;
  amount?: string;
  imageUrl?: string;
  category?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (Object.keys(updateData).length === 0) return;
  return await db.update(items).set(updateData).where(eq(items.id, itemId));
}

export async function updateItemStatus(itemId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(items).set({ status: status as any }).where(eq(items.id, itemId));
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db
    .update(deals)
    .set({ status: "CANCELLED" as any })
    .where(and(eq(deals.status, "OPEN"), lt(deals.createdAt, sevenDaysAgo)));
}

export async function cancelOtherDeals(itemId: number, activeDealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(deals)
    .set({ status: "CANCELLED" as any })
    .where(and(eq(deals.itemId, itemId), ne(deals.id, activeDealId), eq(deals.status, "OPEN")));
}

export async function createDeal(data: {
  itemId: number;
  sellerId: number;
  buyerId?: number;
  amount: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deals).values({
    itemId: data.itemId,
    sellerId: data.sellerId,
    buyerId: data.buyerId,
    amount: data.amount as any,
    status: "OPEN",
  });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return insertId as number;
}

export async function getDealById(dealId: number) {
  await expireOldDeals();
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
  await expireOldDeals();
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
  return results.map((r) => ({
    ...r.deal,
    item: r.item,
  }));
}

export async function getDealsByBuyerId(buyerId: number) {
  await expireOldDeals();
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
  return results.map((r) => ({
    ...r.deal,
    item: r.item,
  }));
}

export async function updateDealStatus(dealId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(deals).set({ status: status as any }).where(eq(deals.id, dealId));
}

export async function confirmDealByBuyer(dealId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(deals).set({ buyerConfirmed: 1 }).where(eq(deals.id, dealId));
}

export async function updateDealUpiQrCode(dealId: number, qrCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(deals).set({ upiQrCode: qrCode }).where(eq(deals.id, dealId));
}

export async function updateUserResetToken(email: string, token: string | null, expiresAt: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.email, email));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ 
    passwordHash, 
    resetToken: null, 
    resetTokenExpiresAt: null,
    tokenVersion: sql`${users.tokenVersion} + 1`
  }).where(eq(users.id, userId));
}

export async function incrementUserTokenVersion(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
}

// Reviews

export async function createReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reviews).values(review);
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
    averageRating: result[0]?.averageRating ? Number(result[0].averageRating).toFixed(1) : "0.0",
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
  const result = await db.insert(messages).values(data);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return insertId as number;
}

