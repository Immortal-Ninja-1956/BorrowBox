import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isBanned: int("isBanned").default(0).notNull(),
  upiId: varchar("upiId", { length: 255 }),
  upiName: varchar("upiName", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  whatsappVerified: int("whatsappVerified").default(0).notNull(),
  whatsappOtp: varchar("whatsappOtp", { length: 6 }),
  whatsappOtpExpiresAt: timestamp("whatsappOtpExpiresAt"),
  isEmailVerified: int("isEmailVerified").default(0).notNull(),
  emailOtp: varchar("emailOtp", { length: 6 }),
  emailOtpExpiresAt: timestamp("emailOtpExpiresAt"),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  tokenVersion: int("tokenVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
  category: varchar("category", { length: 100 }),
  condition: mysqlEnum("condition", ["New", "Like New", "Good", "Fair", "Poor"])
    .default("Good")
    .notNull(),
  status: mysqlEnum("status", [
    "OPEN",
    "Contacted",
    "Shipped",
    "DELIVERED",
    "SOLD",
  ])
    .default("OPEN")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  sellerId: int("sellerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  buyerId: int("buyerId").references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", [
    "OPEN",
    "Contacted",
    "Shipped",
    "DELIVERED",
    "CONFIRMED",
    "PAID",
    "CANCELLED",
  ])
    .default("OPEN")
    .notNull(),
  buyerConfirmed: int("buyerConfirmed").default(0).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  upiQrCode: text("upiQrCode"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  reviewerId: int("reviewerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  revieweeId: int("revieweeId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(), // 1 to 5
  comment: text("comment"),
  role: mysqlEnum("role", ["buyer", "seller"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  senderId: int("senderId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const item_reports = mysqlTable("item_reports", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  reporterId: int("reporterId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["OPEN", "RESOLVED", "DISMISSED"])
    .default("OPEN")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemReport = typeof item_reports.$inferSelect;
export type InsertItemReport = typeof item_reports.$inferInsert;
