CREATE TYPE "public"."condition" AS ENUM('New', 'Like New', 'Good', 'Fair', 'Poor');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('OPEN', 'Contacted', 'Shipped', 'DELIVERED', 'CONFIRMED', 'PAID', 'CANCELLED', 'NEEDS_ATTENTION', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."review_role" AS ENUM('buyer', 'seller');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('OPEN', 'Contacted', 'Shipped', 'DELIVERED', 'SOLD');--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"sellerId" integer NOT NULL,
	"buyerId" integer,
	"status" "deal_status" DEFAULT 'OPEN' NOT NULL,
	"buyerConfirmed" integer DEFAULT 0 NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"upiQrCode" text,
	"pinHash" varchar(255),
	"pinEncrypted" varchar(512),
	"pinAttempts" integer DEFAULT 0 NOT NULL,
	"pinLockedAt" timestamp,
	"pinViewedAt" timestamp,
	"utr" varchar(12),
	"utrSubmittedAt" timestamp,
	"disputedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deals_utr_unique" UNIQUE("utr")
);
--> statement-breakpoint
CREATE TABLE "item_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"reporterId" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sellerId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"imageUrl" text,
	"category" varchar(100),
	"condition" "condition" DEFAULT 'Good' NOT NULL,
	"status" "status" DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"text" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealId" integer NOT NULL,
	"reviewerId" integer NOT NULL,
	"revieweeId" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"role" "review_role" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revoked_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "revoked_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"isBanned" integer DEFAULT 0 NOT NULL,
	"upiId" varchar(255),
	"upiName" varchar(255),
	"whatsapp" varchar(20),
	"whatsappVerified" integer DEFAULT 0 NOT NULL,
	"whatsappOtp" varchar(6),
	"whatsappOtpExpiresAt" timestamp,
	"isEmailVerified" integer DEFAULT 0 NOT NULL,
	"emailOtp" varchar(6),
	"emailOtpExpiresAt" timestamp,
	"resetToken" varchar(255),
	"resetTokenExpiresAt" timestamp,
	"tokenVersion" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_sellerId_users_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyerId_users_id_fk" FOREIGN KEY ("buyerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_reports" ADD CONSTRAINT "item_reports_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_reports" ADD CONSTRAINT "item_reports_reporterId_users_id_fk" FOREIGN KEY ("reporterId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_sellerId_users_id_fk" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_dealId_deals_id_fk" FOREIGN KEY ("dealId") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_dealId_deals_id_fk" FOREIGN KEY ("dealId") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_users_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_users_id_fk" FOREIGN KEY ("revieweeId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_createdAt_idx" ON "items" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "search_idx" ON "items" USING gin (to_tsvector('english', "title" || ' ' || coalesce("description", '')));