import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import crypto from "crypto";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserProfile,
  updateUserWhatsAppOtp,
  verifyUserWhatsApp,
  createItem,
  getItemById,
  getItemsBySellerId,
  getAllItems,
  getPagedItems,
  updateItem,
  updateItemStatus,
  deleteItem,
  createDeal,
  getDealById,
  getDealsByItemId,
  getDealsBySellerId,
  getDealsByBuyerId,
  updateDealStatus,
  confirmDealByBuyer,
  updateDealUpiQrCode,
  updateUserResetToken,
  getUserByResetToken,
  updateUserPassword,
  createReview,
  getReviewsByDealId,
  getUserTrustScore,
  getUserReviews,
  getMessagesByDealId,
  createMessage,
} from "./db";
import { hashPassword, verifyPassword, signSessionToken } from "./_core/auth";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safe } = opts.ctx.user;
      return safe;
    }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }
        const passwordHash = await hashPassword(input.password);
        const userId = await createUser({
          email: input.email,
          passwordHash,
          name: input.name,
        });
        const token = signSessionToken(userId, input.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        const token = signSessionToken(user.id, user.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true };
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await updateUserResetToken(input.email, resetToken, expiresAt);
        
        console.log("\n========================================================");
        console.log(`[Email Simulator] TO: ${input.email}`);
        console.log("--------------------------------------------------------");
        console.log(`Reset your BorrowBox password using the following link:`);
        console.log(`http://localhost:5173/reset-password?token=${resetToken}`);
        console.log("========================================================\n");

        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
        }
        const passwordHash = await hashPassword(input.password);
        await updateUserPassword(user.id, passwordHash);
        return { success: true };
      }),
  }),

  // User profile management
  user: router({
    updateProfile: protectedProcedure
      .input(z.object({
        upiId: z.string().optional(),
        upiName: z.string().optional(),
        whatsapp: z.string().optional().refine((val) => {
          if (!val) return true;
          return /^\+\d{10,15}$/.test(val.replace(/\s+/g, ""));
        }, "WhatsApp number must be in international format (e.g., +91XXXXXXXXXX)"),
      }))
      .mutation(async ({ ctx, input }) => {
        const cleanedInput = {
          ...input,
          whatsapp: input.whatsapp ? input.whatsapp.replace(/\s+/g, "") : input.whatsapp,
        };
        
        // If whatsapp changed, set whatsappVerified to 0
        const currentUser = await getUserById(ctx.user.id);
        const dataToUpdate: any = { ...cleanedInput };
        if (currentUser && cleanedInput.whatsapp && currentUser.whatsapp !== cleanedInput.whatsapp) {
          dataToUpdate.whatsappVerified = 0;
        }

        await updateUserProfile(ctx.user.id, dataToUpdate);
        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) return null;
      const { passwordHash, ...safe } = user;
      return safe;
    }),

    getProfileById: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user) return null;
        const trustScore = await getUserTrustScore(input.userId);
        return { id: user.id, name: user.name, whatsapp: user.whatsapp, trustScore };
      }),

    sendWhatsAppOtp: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !user.whatsapp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No WhatsApp number associated with this account" });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await updateUserWhatsAppOtp(user.id, otp, expiresAt);

      console.log("\n========================================================");
      console.log(`[WhatsApp Simulator] TO: ${user.whatsapp}`);
      console.log("--------------------------------------------------------");
      console.log(`Your BorrowBox WhatsApp verification code is: ${otp}`);
      console.log(`This code will expire in 10 minutes.`);
      console.log("========================================================\n");

      return { success: true };
    }),

    verifyWhatsAppOtp: protectedProcedure
      .input(z.object({
        otp: z.string().length(6, "OTP must be exactly 6 digits"),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });

        if (!user.whatsappOtp || !user.whatsappOtpExpiresAt || user.whatsappOtp !== input.otp) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid OTP" });
        }

        if (user.whatsappOtpExpiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "OTP has expired" });
        }

        await verifyUserWhatsApp(user.id);
        return { success: true };
      }),
  }),

  // Items management
  items: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        amount: z.string().min(1).refine((val) => {
          const num = Number(val);
          return !isNaN(num) && num > 0;
        }, "Price must be a positive number"),
        imageUrl: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const itemId = await createItem({
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description,
          amount: input.amount,
          imageUrl: input.imageUrl,
          category: input.category,
        });
        return { success: true, itemId };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => await getItemById(input.id)),

    getBySeller: publicProcedure
      .input(z.object({ sellerId: z.number() }))
      .query(async ({ input }) => await getItemsBySellerId(input.sellerId)),

    getAll: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(12),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        category: z.string().optional(),
        sellerId: z.number().optional(),
        sortBy: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 12;
        const offset = input?.offset ?? 0;
        const search = input?.search;
        const category = input?.category;
        const sellerId = input?.sellerId;
        const sortBy = input?.sortBy;

        const itemsList = await getPagedItems({
          limit: limit + 1,
          offset,
          search,
          category,
          sellerId,
          sortBy,
        });

        const hasMore = itemsList.length > limit;
        const pagedItems = hasMore ? itemsList.slice(0, limit) : itemsList;

        return {
          items: pagedItems,
          nextOffset: hasMore ? offset + limit : null,
        };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        amount: z.string().optional().refine((val) => {
          if (val === undefined) return true;
          const num = Number(val);
          return !isNaN(num) && num > 0;
        }, "Price must be a positive number"),
        imageUrl: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.id);
        if (!item || item.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        if (item.status !== "OPEN") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit an item that is finalized or sold" });
        }
        await updateItem(input.id, {
          title: input.title,
          description: input.description,
          amount: input.amount,
          imageUrl: input.imageUrl,
          category: input.category,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.id);
        if (!item || item.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        await deleteItem(input.id);
        return { success: true };
      }),
  }),

  // Deals management
  deals: router({
    create: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        buyerId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.itemId);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        const dealId = await createDeal({
          itemId: input.itemId,
          sellerId: item.sellerId,
          buyerId: input.buyerId ?? ctx.user.id,
          amount: item.amount.toString(),
        });
        return { success: true, dealId };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => await getDealById(input.id)),

    getByItem: publicProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ input }) => await getDealsByItemId(input.itemId)),

    getBySeller: protectedProcedure.query(async ({ ctx }) => await getDealsBySellerId(ctx.user.id)),

    getByBuyer: protectedProcedure.query(async ({ ctx }) => await getDealsByBuyerId(ctx.user.id)),

    updateStatus: protectedProcedure
      .input(z.object({
        dealId: z.number(),
        status: z.enum(["OPEN", "Shipped", "DELIVERED"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal || deal.sellerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        await updateDealStatus(input.dealId, input.status);

        // When deal is finalized ("Shipped") or beyond, update the item status
        if (input.status === "Shipped" || input.status === "DELIVERED") {
          await updateItemStatus(deal.itemId, input.status);
        }

        // Notify buyer
        if (deal.buyerId) {
          const buyer = await getUserById(deal.buyerId);
          if (buyer?.email) {
            console.log(`[Email] To ${buyer.email}: Your deal #${deal.id} status updated to ${input.status}`);
          }
        }
        return { success: true };
      }),

    confirmDelivery: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal || deal.buyerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized - only buyer can confirm" });
        if (deal.status !== "DELIVERED") throw new TRPCError({ code: "BAD_REQUEST", message: "Deal must be DELIVERED before confirming" });
        await confirmDealByBuyer(input.dealId);
        // Also update deal status to CONFIRMED
        await updateDealStatus(input.dealId, "CONFIRMED");
        const seller = await getUserById(deal.sellerId);
        if (seller?.upiId && seller?.upiName) {
          const qrCode = generateUpiQrCode(seller.upiId, seller.upiName, deal.amount.toString(), `Item ${deal.itemId}`);
          await updateDealUpiQrCode(input.dealId, qrCode);
        }
        return { success: true };
      }),

    markPaid: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal || deal.buyerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized - only buyer can mark as paid" });
        if (!deal.buyerConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Must confirm delivery before marking as paid" });
        // Mark deal as PAID
        await updateDealStatus(input.dealId, "PAID");
        // Mark item as DELIVERED (final state)
        await updateItemStatus(deal.itemId, "DELIVERED");
        return { success: true };
      }),

    getUpiQrCode: publicProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal) throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        return { qrCode: deal.upiQrCode };
      }),
  }),

  // Reviews management
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        dealId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal) throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.status !== "PAID") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only review completed deals" });
        
        let role: "buyer" | "seller";
        let revieweeId: number;

        if (deal.buyerId === ctx.user.id) {
          role = "buyer";
          revieweeId = deal.sellerId;
        } else if (deal.sellerId === ctx.user.id) {
          role = "seller";
          revieweeId = deal.buyerId!;
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not part of this deal" });
        }

        // Ensure user hasn't already reviewed this deal
        const existingReviews = await getReviewsByDealId(deal.id);
        const hasReviewed = existingReviews.some(r => r.reviewerId === ctx.user.id);
        if (hasReviewed) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You have already left a review for this deal" });
        }

        await createReview({
          dealId: deal.id,
          reviewerId: ctx.user.id,
          revieweeId,
          rating: input.rating,
          comment: input.comment,
          role,
        });

        return { success: true };
      }),

    getByDeal: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ input }) => {
        return await getReviewsByDealId(input.dealId);
      }),

    getByUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const reviews = await getUserReviews(input.userId);
        const trustScore = await getUserTrustScore(input.userId);
        return { reviews, trustScore };
      }),
  }),

  messages: router({
    getByDealId: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal) throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.buyerId !== ctx.user.id && deal.sellerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this deal" });
        }
        return await getMessagesByDealId(input.dealId);
      }),

    send: protectedProcedure
      .input(z.object({ dealId: z.number(), text: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal) throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.buyerId !== ctx.user.id && deal.sellerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this deal" });
        }
        return await createMessage({
          dealId: input.dealId,
          senderId: ctx.user.id,
          text: input.text,
        });
      }),
  }),
});
function generateUpiQrCode(upiId: string, upiName: string, amount: string, note: string): string {
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&tn=${encodeURIComponent(note)}`;
}

export type AppRouter = typeof appRouter;
