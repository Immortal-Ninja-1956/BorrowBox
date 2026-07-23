import {
  serial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const conditionEnum = pgEnum("condition", ["New", "Like New", "Good", "Fair", "Poor"]);
export const statusEnum = pgEnum("status", ["OPEN", "Contacted", "Shipped", "DELIVERED", "SOLD"]);
export const dealStatusEnum = pgEnum("deal_status", ["OPEN", "Contacted", "Shipped", "DELIVERED", "CONFIRMED", "PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"]);
export const reviewRoleEnum = pgEnum("review_role", ["buyer", "seller"]);
export const reportStatusEnum = pgEnum("report_status", ["OPEN", "RESOLVED", "DISMISSED"]);
export const rejectionStatusEnum = pgEnum("rejection_status", ["PENDING", "APPROVED", "DISMISSED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").default("user").notNull(),
  isBanned: integer("isBanned").default(0).notNull(),
  upiId: varchar("upiId", { length: 255 }),
  upiName: varchar("upiName", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  whatsappVerified: integer("whatsappVerified").default(0).notNull(),
  whatsappOtp: varchar("whatsappOtp", { length: 64 }),
  whatsappOtpExpiresAt: timestamp("whatsappOtpExpiresAt"),
  isEmailVerified: integer("isEmailVerified").default(0).notNull(),
  emailOtp: varchar("emailOtp", { length: 6 }),
  emailOtpExpiresAt: timestamp("emailOtpExpiresAt"),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  tokenVersion: integer("tokenVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  trustScore: decimal("trustScore", { precision: 5, scale: 2 }).default("5.00").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  sellerId: integer("sellerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
  category: varchar("category", { length: 100 }),
  condition: conditionEnum("condition").default("Good").notNull(),
  status: statusEnum("status").default("OPEN").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => {
  return {
    statusCreatedAtIdx: index("status_createdAt_idx").on(table.status, table.createdAt),
    sellerIdStatusIdx: index("items_sellerId_status_idx").on(table.sellerId, table.status),
    categoryStatusCreatedAtIdx: index("items_category_status_createdAt_idx").on(table.category, table.status, table.createdAt),
    searchIdx: index("search_idx").using("gin", sql`to_tsvector('english', ${table.title} || ' ' || coalesce(${table.description}, ''))`),
  };
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  sellerId: integer("sellerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  buyerId: integer("buyerId").references(() => users.id, { onDelete: "cascade" }),
  status: dealStatusEnum("status").default("OPEN").notNull(),
  buyerConfirmed: integer("buyerConfirmed").default(0).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  upiQrCode: text("upiQrCode"),
  pinHash: varchar("pinHash", { length: 255 }),
  pinEncrypted: varchar("pinEncrypted", { length: 512 }),
  pinAttempts: integer("pinAttempts").default(0).notNull(),
  pinLockedAt: timestamp("pinLockedAt"),
  pinViewedAt: timestamp("pinViewedAt"),
  utr: varchar("utr", { length: 12 }).unique(),
  utrSubmittedAt: timestamp("utrSubmittedAt"),
  disputedAt: timestamp("disputedAt"),
  disputeCount: integer("disputeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => {
  return {
    buyerIdStatusIdx: index("deals_buyerId_status_idx").on(table.buyerId, table.status),
    sellerIdStatusIdx: index("deals_sellerId_status_idx").on(table.sellerId, table.status),
  };
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  dealId: integer("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  reviewerId: integer("reviewerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  revieweeId: integer("revieweeId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment"),
  role: reviewRoleEnum("role").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  dealId: integer("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  senderId: integer("senderId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const item_reports = pgTable("item_reports", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  reporterId: integer("reporterId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("OPEN").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    statusIdx: index("item_reports_status_idx").on(table.status),
  };
});

export type ItemReport = typeof item_reports.$inferSelect;
export type InsertItemReport = typeof item_reports.$inferInsert;

export const revoked_tokens = pgTable("revoked_tokens", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type RevokedToken = typeof revoked_tokens.$inferSelect;
export type InsertRevokedToken = typeof revoked_tokens.$inferInsert;

export const admin_actions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("adminId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  targetId: integer("targetId").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AdminAction = typeof admin_actions.$inferSelect;
export type InsertAdminAction = typeof admin_actions.$inferInsert;

export const item_rejections = pgTable("item_rejections", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  reason: text("reason").notNull(),
  confidenceScores: text("confidenceScores"),
  status: rejectionStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type ItemRejection = typeof item_rejections.$inferSelect;
export type InsertItemRejection = typeof item_rejections.$inferInsert;

export const image_vision_cache = pgTable("image_vision_cache", {
  id: serial("id").primaryKey(),
  imageHash: varchar("imageHash", { length: 64 }).notNull().unique(),
  safe: integer("safe").notNull(),
  reason: text("reason"),
  confidenceScores: text("confidenceScores"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImageVisionCache = typeof image_vision_cache.$inferSelect;
export type InsertImageVisionCache = typeof image_vision_cache.$inferInsert;

export const deal_events = pgTable("deal_events", {
  id: serial("id").primaryKey(),
  dealId: integer("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fromStatus: varchar("fromStatus", { length: 50 }).notNull(),
  toStatus: varchar("toStatus", { length: 50 }).notNull(),
  actorId: integer("actorId").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type DealEvent = typeof deal_events.$inferSelect;
export type InsertDealEvent = typeof deal_events.$inferInsert;

export const user_pin_failures = pgTable("user_pin_failures", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  failureCount: integer("failureCount").default(0).notNull(),
  resetAt: timestamp("resetAt").notNull(),
});

export type UserPinFailure = typeof user_pin_failures.$inferSelect;
export type InsertUserPinFailure = typeof user_pin_failures.$inferInsert;
