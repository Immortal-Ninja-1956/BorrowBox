import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import crypto from "crypto";
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUsersByIds,
  updateUserProfile,
  updateUserWhatsAppOtp,
  verifyUserWhatsApp,
  anonymizeUser,
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
  cancelOtherDeals,
  getUserByResetToken,
  updateUserPassword,
  createReview,
  getReviewsByDealId,
  getUserTrustScore,
  getUserReviews,
  getMessagesByDealId,
  createMessage,
  incrementUserTokenVersion,
  getAllUsersAdmin,
  updateUserBanStatus,
  getPlatformStats,
  createItemReport,
  getAllItemReportsAdmin,
  updateItemReportStatus,
  revokeToken,
  getDealRawById,
  updateDealPinData,
  setDealPinViewed,
  incrementPinAttempts,
  lockDealPin,
  setDealUtr,
  isDuplicateUtr,
  setDealDisputed,
  completeDealAtomically,
  confirmDeliveryAtomically,
  advanceDealStatusAtomically,
} from "./db";
import { generatePin, decryptPin, verifyPin, generateDealTag } from "./pin";
// Custom auth logic removed, moved to Supabase
import { TRPCError } from "@trpc/server";

// ─── Prohibited Items Filter ────────────────────────────────────────────────
const BANNED_KEYWORDS = [
  "maggi",
  "noodle",
  "noodles",
  "kettle",
  "harmful",
  "substance",
  "substances",
  "weapon",
  "drug",
  "drugs",
  "cigarette",
  "alcohol",
  "liquor",
  "vape",
  "gun",
  "knife"
];

function containsBannedKeywords(text: string | undefined): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_KEYWORDS.some(keyword => {
    // Use word boundaries so "noodle" doesn't match "snoodled" 
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(lowerText);
  });
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safe } = opts.ctx.user;
      return safe;
    }),
    syncSession: publicProcedure
      .input(z.object({ accessToken: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getSessionCookieOptions } = await import("./_core/cookies");
        ctx.res.cookie("sb-access-token", input.accessToken, getSessionCookieOptions(ctx.req));
        return { success: true };
      }),
    clearSession: publicProcedure
      .mutation(async ({ ctx }) => {
        const { getSessionCookieOptions } = await import("./_core/cookies");
        const { hashToken } = await import("./_core/auth");
        const cookie = await import("cookie");

        // 1. Extract the token to revoke
        let token: string | undefined;
        const authHeader = ctx.req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        }
        if (!token && ctx.req.headers.cookie) {
          try {
            const parsedCookies = cookie.parse(ctx.req.headers.cookie);
            token = parsedCookies["sb-access-token"];
          } catch (err) {
            console.error("[Auth] Error parsing cookie for revocation:", err);
          }
        }

        // 2. Revoke the token if found
        if (token) {
          try {
            const tokenHash = hashToken(token);
            // Parse JWT expiry (exp is Unix timestamp in seconds)
            const parts = token.split(".");
            let expiresAt = new Date(Date.now() + 3600 * 1000); // fallback: 1 hour
            if (parts.length === 3) {
              const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
              const payload = JSON.parse(payloadJson);
              if (payload && typeof payload.exp === "number") {
                expiresAt = new Date(payload.exp * 1000);
              }
            }
            await revokeToken(tokenHash, expiresAt);
          } catch (err) {
            console.error("[Auth] Failed to revoke session token:", err);
          }
        }

        const options = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie("sb-access-token", {
          path: options.path,
          domain: options.domain,
          secure: options.secure,
          sameSite: options.sameSite,
        });
        return { success: true };
      }),
  }),

  // User profile management
  user: router({
    updateProfile: protectedProcedure
      .input(
        z.object({
          upiId: z
            .string()
            .max(64, "UPI ID must be 64 characters or fewer")
            .regex(
              /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/,
              "Invalid UPI ID format (e.g. name@upi)"
            )
            .optional(),
          upiName: z.string().max(80).optional(),
          whatsapp: z
            .string()
            .optional()
            .refine(val => {
              if (!val) return true;
              return /^\+\d{10,15}$/.test(val.replace(/\s+/g, ""));
            }, "WhatsApp number must be in international format (e.g., +91XXXXXXXXXX)"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cleanedInput = {
          ...input,
          whatsapp: input.whatsapp
            ? input.whatsapp.replace(/\s+/g, "")
            : input.whatsapp,
        };

        // If whatsapp changed, set whatsappVerified to 0
        const currentUser = await getUserById(ctx.user.id);
        const dataToUpdate: any = { ...cleanedInput };
        if (
          currentUser &&
          cleanedInput.whatsapp &&
          currentUser.whatsapp !== cleanedInput.whatsapp
        ) {
          dataToUpdate.whatsappVerified = 0;
        }

        await updateUserProfile(ctx.user.id, dataToUpdate);
        return { success: true };
      }),

    deleteAccount: protectedProcedure
      .mutation(async ({ ctx }) => {
        await anonymizeUser(ctx.user.id);
        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) return null;
      const { passwordHash, ...safe } = user;
      return safe;
    }),

    getProfileById: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user) return null;
        const trustScore = await getUserTrustScore(input.userId);
        return {
          id: user.id,
          name: user.name,
          whatsapp: user.whatsapp,
          whatsappVerified: user.whatsappVerified,
          trustScore,
        };
      }),

    getPublicProfileById: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.userId);
        if (!user) return null;
        
        const trustScore = await getUserTrustScore(input.userId);
        
        const items = await getPagedItems({ limit: 50, offset: 0, sellerId: input.userId });
        const activeListings = items.filter(i => i.status === "OPEN");

        const deals = await getDealsBySellerId(input.userId);
        const completedDealsCount = deals.filter(d => d.status === "CONFIRMED" || d.status === "DELIVERED").length;

        const reviews = await getUserReviews(input.userId);
        
        const reviewerIds = Array.from(new Set(reviews.map(r => r.reviewerId)));
        const reviewers = await getUsersByIds(reviewerIds);
        const reviewerMap = new Map(reviewers.map(u => [u.id, u.name]));
        
        const enrichedReviews = reviews.map(r => ({
          ...r,
          reviewerName: reviewerMap.get(r.reviewerId) || "Unknown User"
        }));

        return {
          id: user.id,
          name: user.name,
          joinedAt: user.createdAt,
          isEmailVerified: user.isEmailVerified,
          whatsappVerified: user.whatsappVerified,
          trustScore,
          completedDealsCount,
          activeListings,
          reviews: enrichedReviews
        };
      }),

    sendWhatsAppOtp: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !user.whatsapp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No WhatsApp number associated with this account",
        });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await updateUserWhatsAppOtp(user.id, otp, expiresAt);

      if (process.env.NODE_ENV !== "production") {
        console.log("\n========================================================");
        console.log(`[WhatsApp Simulator] TO: ${user.whatsapp}`);
        console.log("--------------------------------------------------------");
        console.log(`Your BorrowBox WhatsApp verification code is: ${otp}`);
        console.log(`This code will expire in 10 minutes.`);
        console.log("========================================================\n");
      } else {
        console.log(`[WhatsApp] OTP sent to user ID: ${user.id}`);
      }

      return { success: true };
    }),

    verifyWhatsAppOtp: protectedProcedure
      .input(
        z.object({
          otp: z.string().length(6, "OTP must be exactly 6 digits"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          });

        if (
          !user.whatsappOtp ||
          !user.whatsappOtpExpiresAt ||
          user.whatsappOtp !== input.otp
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid OTP" });
        }

        if (user.whatsappOtpExpiresAt.getTime() < Date.now()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "OTP has expired",
          });
        }

        await verifyUserWhatsApp(user.id);
        return { success: true };
      }),
  }),

  // Items management
  items: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255, "Title must be 255 characters or fewer"),
          description: z.string().max(4000, "Description is too long").optional(),
          amount: z
            .string()
            .min(1)
            .refine(val => {
              const num = Number(val);
              return !isNaN(num) && num > 0;
            }, "Price must be a positive number"),
          imageUrl: z.string().optional(),
          category: z.string().optional(),
          condition: z
            .enum(["New", "Like New", "Good", "Fair", "Poor"])
            .default("Good"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (containsBannedKeywords(input.title) || containsBannedKeywords(input.description)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your listing contains restricted items/keywords (e.g. Maggi, noodles, kettle, etc.) which are not allowed.",
          });
        }

        if (!ctx.user.whatsappVerified) {
          const existing = await getItemsBySellerId(ctx.user.id);
          if (existing.length >= 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Verify your WhatsApp to post more listings.",
            });
          }
        }

        const itemId = await createItem({
          sellerId: ctx.user.id,
          title: input.title,
          description: input.description,
          amount: input.amount,
          imageUrl: input.imageUrl,
          category: input.category,
          condition: input.condition,
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
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(12),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
            category: z.string().optional(),
            sellerId: z.number().optional(),
            sortBy: z.string().optional(),
          })
          .optional()
      )
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
      .input(
        z.object({
          id: z.number(),
          title: z.string().max(255, "Title must be 255 characters or fewer").optional(),
          description: z.string().max(4000, "Description is too long").optional(),
          amount: z
            .string()
            .optional()
            .refine(val => {
              if (val === undefined) return true;
              const num = Number(val);
              return !isNaN(num) && num > 0;
            }, "Price must be a positive number"),
          imageUrl: z.string().optional(),
          category: z.string().optional(),
          condition: z
            .enum(["New", "Like New", "Good", "Fair", "Poor"])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (containsBannedKeywords(input.title) || containsBannedKeywords(input.description)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your listing contains restricted items/keywords (e.g. Maggi, noodles, kettle, etc.) which are not allowed.",
          });
        }

        const item = await getItemById(input.id);
        if (!item || item.sellerId !== ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        if (item.status !== "OPEN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot edit an item that is finalized or sold",
          });
        }
        await updateItem(input.id, {
          title: input.title,
          description: input.description,
          amount: input.amount,
          imageUrl: input.imageUrl,
          category: input.category,
          condition: input.condition,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.id);
        if (!item || item.sellerId !== ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        await deleteItem(input.id);
        return { success: true };
      }),

    report: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
          reason: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.itemId);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }
        await createItemReport({
          itemId: input.itemId,
          reporterId: ctx.user.id,
          reason: input.reason,
          description: input.description,
        });
        return { success: true };
      }),
  }),

  // Deals management
  deals: router({
    create: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.itemId);
        if (!item)
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        if (ctx.user.id === item.sellerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sellers cannot buy their own items",
          });
        }
        if (item.status !== "OPEN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This item is no longer open for offers.",
          });
        }

        const buyerId = ctx.user.id;
        const otherDeals = await getDealsByItemId(input.itemId);
        const hasExistingDeal = otherDeals.some(
          d => d.buyerId === buyerId && d.status !== "CANCELLED"
        );
        if (hasExistingDeal) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already expressed interest in this item.",
          });
        }

        // Generate PIN for deal completion handshake
        const pinData = await generatePin();

        const dealId = await createDeal({
          itemId: input.itemId,
          sellerId: item.sellerId,
          buyerId,
          amount: item.amount.toString(),
          pinHash: pinData.hash,
          pinEncrypted: pinData.encrypted,
        });
        return { success: true, dealId };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const deal = await getDealById(input.id);
        if (!deal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deal not found",
          });
        }
        if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to view this deal.",
          });
        }
        return deal;
      }),

    getByItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .query(async ({ ctx, input }) => {
        const allDeals = await getDealsByItemId(input.itemId);
        if (allDeals.length === 0) return [];

        const item = await getItemById(input.itemId);
        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Item not found",
          });
        }

        if (ctx.user.id === item.sellerId) {
          return allDeals;
        }

        return allDeals.filter(d => d.buyerId === ctx.user.id);
      }),

    getBySeller: protectedProcedure.query(
      async ({ ctx }) => await getDealsBySellerId(ctx.user.id)
    ),

    getByBuyer: protectedProcedure.query(
      async ({ ctx }) => await getDealsByBuyerId(ctx.user.id)
    ),

    updateStatus: protectedProcedure
      .input(
        z.object({
          dealId: z.number(),
          status: z.enum(["OPEN", "Shipped", "DELIVERED"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.sellerId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        try {
          await advanceDealStatusAtomically(input.dealId, deal.itemId, input.status);
        } catch (e: any) {
          if (e.message === "ANOTHER_ACTIVE_DEAL") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Another active deal is already in progress for this item.",
            });
          }
          throw e;
        }

        // Notify buyer
        if (deal.buyerId) {
          const buyer = await getUserById(deal.buyerId);
          if (buyer?.email) {
            console.log(
              `[Email] To ${buyer.email}: Your deal #${deal.id} status updated to ${input.status}`
            );
          }
        }
        return { success: true };
      }),

    confirmDelivery: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (deal.status !== "DELIVERED")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Deal must be DELIVERED before confirming",
          });
        const seller = await getUserById(deal.sellerId);
        let qrCode: string | undefined = undefined;
        if (seller?.upiId && seller?.upiName) {
          qrCode = generateUpiQrCode(
            seller.upiId,
            seller.upiName,
            deal.amount.toString(),
            generateDealTag(input.dealId)
          );
        }
        await confirmDeliveryAtomically(input.dealId, qrCode);
        return { success: true };
      }),

    markPaid: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (!deal.buyerConfirmed)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Must confirm delivery before marking as paid",
          });
        // Mark deal as PAID and item as SOLD atomically
        await completeDealAtomically(input.dealId, deal.itemId);
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        const TERMINAL_OR_FROZEN = ["PAID", "CANCELLED", "NEEDS_ATTENTION", "DISPUTED"];
        if (TERMINAL_OR_FROZEN.includes(deal.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel a completed, cancelled, or disputed deal",
          });
        }

        // Mark deal as CANCELLED
        await updateDealStatus(input.dealId, "CANCELLED");

        // Revert item status to OPEN if there are no other active/completed deals
        const otherDeals = await getDealsByItemId(deal.itemId);
        const hasOtherActiveDeal = otherDeals.some(
          d =>
            d.id !== deal.id &&
            ["Shipped", "DELIVERED", "CONFIRMED", "PAID"].includes(d.status)
        );
        if (!hasOtherActiveDeal) {
          await updateItemStatus(deal.itemId, "OPEN");
        }

        // Notify other party (simulation)
        const otherPartyId =
          ctx.user.id === deal.sellerId ? deal.buyerId : deal.sellerId;
        if (otherPartyId) {
          const otherUser = await getUserById(otherPartyId);
          if (otherUser?.email) {
            console.log(
              `[Email] To ${otherUser.email}: Deal #${deal.id} has been cancelled.`
            );
          }
        }

        return { success: true };
      }),

    getUpiQrCode: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        return { qrCode: deal.upiQrCode };
      }),

    // ─── PIN-based deal completion procedures ─────────────────────────────

    getMyDealPin: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ ctx, input }) => {
        const deal = await getDealRawById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the buyer can view the deal PIN",
          });
        }
        if (["CANCELLED", "PAID"].includes(deal.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "PIN is not available for completed or cancelled deals",
          });
        }
        if (!deal.pinEncrypted) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "PIN data is missing for this deal",
          });
        }
        const pin = decryptPin(deal.pinEncrypted);
        const viewedBefore = !!deal.pinViewedAt;
        if (!deal.pinViewedAt) {
          await setDealPinViewed(input.dealId);
        }
        return { pin, viewedBefore };
      }),

    confirmWithPin: protectedProcedure
      .input(
        z.object({
          dealId: z.number(),
          pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealRawById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.sellerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the seller can confirm with PIN",
          });
        }
        if (deal.status === "PAID" || deal.status === "CANCELLED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This deal is already completed or cancelled",
          });
        }
        if (deal.pinLockedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "PIN entry is locked due to too many failed attempts. Please raise a dispute to unlock.",
          });
        }
        if (!deal.pinHash) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "PIN hash is missing for this deal",
          });
        }
        const isValid = await verifyPin(input.pin, deal.pinHash);
        if (!isValid) {
          const newAttempts = deal.pinAttempts + 1;
          await incrementPinAttempts(input.dealId);
          if (newAttempts >= 5) {
            await lockDealPin(input.dealId);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "PIN is now locked after 5 failed attempts. Raise a dispute to reset.",
            });
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Incorrect PIN. ${5 - newAttempts} attempt(s) remaining.`,
          });
        }
        // Success — atomically complete the deal
        await completeDealAtomically(input.dealId, deal.itemId);
        return { success: true };
      }),

    submitUtr: protectedProcedure
      .input(
        z.object({
          dealId: z.number(),
          utr: z.string().regex(/^\d{12}$/, "UTR must be exactly 12 digits"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealRawById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the buyer can submit a UTR",
          });
        }
        if (!(["PAID", "DISPUTED"] as string[]).includes(deal.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "UTR can only be submitted for completed or disputed deals",
          });
        }
        if (deal.utr) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A UTR has already been submitted for this deal",
          });
        }
        const duplicate = await isDuplicateUtr(input.utr, input.dealId);
        if (duplicate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This UTR has already been used on another deal",
          });
        }
        await setDealUtr(input.dealId, input.utr);
        return { success: true };
      }),

    raiseDispute: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealRawById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only participants can raise a dispute",
          });
        }
        if (["PAID", "CANCELLED"].includes(deal.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot dispute a completed or cancelled deal",
          });
        }
        // Set status to DISPUTED
        await setDealDisputed(input.dealId);
        // Regenerate PIN (invalidates old one, resets attempts)
        const newPin = await generatePin();
        await updateDealPinData(input.dealId, {
          pinHash: newPin.hash,
          pinEncrypted: newPin.encrypted,
          pinAttempts: 0,
          pinLockedAt: null,
        });
        return { success: true };
      }),
  }),

  // Reviews management
  reviews: router({
    create: protectedProcedure
      .input(
        z.object({
          dealId: z.number(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.status !== "PAID")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only review completed deals",
          });

        let role: "buyer" | "seller";
        let revieweeId: number;

        if (deal.buyerId === ctx.user.id) {
          role = "buyer";
          revieweeId = deal.sellerId;
        } else if (deal.sellerId === ctx.user.id) {
          role = "seller";
          revieweeId = deal.buyerId!;
        } else {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not part of this deal",
          });
        }

        if (revieweeId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot review yourself' });
        }

        // Ensure user hasn't already reviewed this deal
        const existingReviews = await getReviewsByDealId(deal.id);
        const hasReviewed = existingReviews.some(
          r => r.reviewerId === ctx.user.id
        );
        if (hasReviewed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already left a review for this deal",
          });
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
      .query(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.buyerId !== ctx.user.id && deal.sellerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not a participant in this deal",
          });
        }
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
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.buyerId !== ctx.user.id && deal.sellerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not a participant in this deal",
          });
        }
        return await getMessagesByDealId(input.dealId);
      }),

    send: protectedProcedure
      .input(z.object({ dealId: z.number(), text: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (deal.buyerId !== ctx.user.id && deal.sellerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not a participant in this deal",
          });
        }
        return await createMessage({
          dealId: input.dealId,
          senderId: ctx.user.id,
          text: input.text,
        });
      }),
  }),

  // Admin management
  admin: router({
    getStats: adminProcedure.query(async () => {
      return await getPlatformStats();
    }),
    getAllUsers: adminProcedure.query(async () => {
      return await getAllUsersAdmin();
    }),
    banUser: adminProcedure
      .input(z.object({ userId: z.number(), isBanned: z.number() }))
      .mutation(async ({ input }) => {
        await updateUserBanStatus(input.userId, input.isBanned);
        return { success: true };
      }),
    deleteItem: adminProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteItem(input.itemId);
        return { success: true };
      }),
    deleteDeal: adminProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ input }) => {
        await updateDealStatus(input.dealId, "CANCELLED");
        return { success: true };
      }),
    getReports: adminProcedure.query(async () => {
      return await getAllItemReportsAdmin();
    }),
    updateReportStatus: adminProcedure
      .input(
        z.object({
          reportId: z.number(),
          status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateItemReportStatus(input.reportId, input.status);
        return { success: true };
      }),
  }),
});
function generateUpiQrCode(
  upiId: string,
  upiName: string,
  amount: string,
  note: string
): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(note)}`;
}

export type AppRouter = typeof appRouter;
