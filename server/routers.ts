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
  logAdminAction,
  getAdminActions,
  createItemRejection,
  getAllItemRejectionsAdmin,
  updateItemRejectionStatus,
  approveRejectionAndCreateItem,
  getDealEventsByDealId,
  getAllDealEventsAdmin,
  recomputeAllUserTrustScores,
  getSuggestedPrice,
  checkGlobalPinLimit,
  recordGlobalPinFailure,
  resetGlobalPinFailures,
  getCompletedDealsCountBySellerId,
  cancelDealAtomically,
  getItemReportByUserAndItem,
} from "./db";
import { generatePin, decryptPin, verifyPin, generateDealTag } from "./pin";
import { checkImageSafety } from "./vision";
import { checkTextModeration } from "./moderation";
import { isValidCurrencyFormat } from "../shared/currency";
// Custom auth logic removed, moved to Supabase
import { TRPCError } from "@trpc/server";



export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const safe = opts.ctx.user;
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
      const safe = user;
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
        
        const items = await getPagedItems({ limit: 10, offset: 0, sellerId: input.userId });
        const activeListings = items.filter(i => i.status === "OPEN");

        const completedDealsCount = await getCompletedDealsCountBySellerId(input.userId);

        const allReviews = await getUserReviews(input.userId);
        const reviews = allReviews.slice(0, 5);
        
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
          user.whatsappOtp !== crypto.createHash("sha256").update(input.otp).digest("hex")
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
            .refine(val => isValidCurrencyFormat(val), "Price must be a valid positive currency amount up to 2 decimal places (e.g. 150 or 150.50)"),
          imageUrl: z.string().optional(),
          category: z.string().optional(),
          condition: z
            .enum(["New", "Like New", "Good", "Fair"])
            .default("Good"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const textCheck = checkTextModeration(input.title, input.description);
        if (!textCheck.safe) {
          try {
            await createItemRejection({
              userId: ctx.user.id,
              title: input.title,
              description: input.description,
              amount: input.amount,
              imageUrl: input.imageUrl,
              category: input.category,
              condition: input.condition,
              reason: textCheck.reason || "Your listing was flagged for restricted content. Please review your title and description.",
              confidenceScores: JSON.stringify({ flaggedKeyword: textCheck.flaggedKeyword, type: "TEXT_MODERATION" }),
              status: "PENDING",
            });
          } catch (rejectionErr) {
            console.error("[ItemRejection] Failed to record rejection in DB:", rejectionErr);
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: textCheck.reason || "Your listing was flagged for restricted content. Please review your title and description.",
          });
        }

        if (input.imageUrl) {
          const safety = await checkImageSafety(input.imageUrl);
          if (!safety.safe) {
            try {
              await createItemRejection({
                userId: ctx.user.id,
                title: input.title,
                description: input.description,
                amount: input.amount,
                imageUrl: input.imageUrl,
                category: input.category,
                condition: input.condition,
                reason: safety.reason || "Image moderation flagged restricted content",
                confidenceScores: JSON.stringify(safety.confidenceScores || { type: "IMAGE_SAFETY" }),
                status: "PENDING",
              });
            } catch (rejectionErr) {
              console.error("[ItemRejection] Failed to record image rejection in DB:", rejectionErr);
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: safety.reason || "That photo didn't pass our check. Please use a clear, real photo of the item you're selling.",
            });
          }
        }

        if (!ctx.user.whatsappVerified) {
          const existing = await getItemsBySellerId(ctx.user.id);
          if (existing.length >= 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You've already posted 1 listing without verifying your WhatsApp. Verify your number to post more — it only takes a minute!",
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
            .refine(val => val === undefined || isValidCurrencyFormat(val), "Price must be a valid positive currency amount up to 2 decimal places (e.g. 150 or 150.50)"),
          imageUrl: z.string().optional(),
          category: z.string().optional(),
          condition: z
            .enum(["New", "Like New", "Good", "Fair"])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const item = await getItemById(input.id);
        if (!item || item.sellerId !== ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });

        const finalTitle = input.title !== undefined ? input.title : item.title;
        const finalDescription = input.description !== undefined ? input.description : item.description;
        const finalAmount = input.amount !== undefined ? input.amount : item.amount;
        const finalCategory = input.category !== undefined ? input.category : item.category;
        const finalCondition = input.condition !== undefined ? input.condition : item.condition;

        const textCheck = checkTextModeration(finalTitle, finalDescription);
        if (!textCheck.safe) {
          try {
            await createItemRejection({
              userId: ctx.user.id,
              title: finalTitle,
              description: finalDescription,
              amount: finalAmount,
              imageUrl: input.imageUrl || item.imageUrl,
              category: finalCategory,
              condition: finalCondition,
              reason: textCheck.reason || "Your listing was flagged for restricted content. Please review your title and description.",
              confidenceScores: JSON.stringify({ flaggedKeyword: textCheck.flaggedKeyword, type: "TEXT_MODERATION" }),
              status: "PENDING",
            });
          } catch (rejectionErr) {
            console.error("[ItemRejection] Failed to record rejection in DB:", rejectionErr);
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: textCheck.reason || "Your listing was flagged for restricted content. Please review your title and description.",
          });
        }

        if (input.imageUrl) {
          const safety = await checkImageSafety(input.imageUrl);
          if (!safety.safe) {
            try {
              await createItemRejection({
                userId: ctx.user.id,
                title: finalTitle,
                description: finalDescription,
                amount: finalAmount,
                imageUrl: input.imageUrl,
                category: finalCategory,
                condition: finalCondition,
                reason: safety.reason || "Image moderation flagged restricted content",
                confidenceScores: JSON.stringify(safety.confidenceScores || { type: "IMAGE_SAFETY" }),
                status: "PENDING",
              });
            } catch (rejectionErr) {
              console.error("[ItemRejection] Failed to record image rejection in DB:", rejectionErr);
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: safety.reason || "That photo didn't pass our check. Please use a clear, real photo of the item you're selling.",
            });
          }
        }

        if (item.status !== "OPEN") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This listing is no longer editable since it's already been sold or completed.",
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
        const existingReport = await getItemReportByUserAndItem(input.itemId, ctx.user.id);
        if (existingReport) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already reported this item.",
          });
        }
        await createItemReport({
          itemId: input.itemId,
          reporterId: ctx.user.id,
          reason: input.reason,
          description: input.description,
        });
        return { success: true };
      }),

    testVision: protectedProcedure
      .query(async () => {
        const hasProj = !!process.env.GOOGLE_PROJECT_ID;
        const hasEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
        const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
        
        let clientStatus = "Not initialized";
        let errorMsg = null;
        
        try {
          const testRes = await checkImageSafety("https://images.unsplash.com/photo-1541963463532-d68292c34b19");
          clientStatus = `Checked test image, result: ${JSON.stringify(testRes)}`;
        } catch (err: any) {
          clientStatus = "Failed to run checkImageSafety function";
          errorMsg = err.message || String(err);
        }
        
        return {
          env: {
            GOOGLE_PROJECT_ID: hasProj ? "Present" : "Missing",
            GOOGLE_CLIENT_EMAIL: hasEmail ? "Present" : "Missing",
            GOOGLE_PRIVATE_KEY: hasKey ? `Present (length: ${process.env.GOOGLE_PRIVATE_KEY?.length})` : "Missing"
          },
          clientStatus,
          errorMsg
        };
      }),

    getPriceSuggestion: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          title: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getSuggestedPrice(input);
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
        
        const textCheck = checkTextModeration(item.title, item.description);
        if (!textCheck.safe) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: textCheck.reason || "This item contains restricted keywords and cannot be transacted.",
          });
        }

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
          await advanceDealStatusAtomically(input.dealId, deal.itemId, input.status, ctx.user.id);
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
        await confirmDeliveryAtomically(input.dealId, qrCode, ctx.user.id);
        return { success: true };
      }),

    getEvents: protectedProcedure
      .input(z.object({ dealId: z.number() }))
      .query(async ({ ctx, input }) => {
        const deal = await getDealById(input.dealId);
        if (!deal)
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        return await getDealEventsByDealId(input.dealId);
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
        try {
          await cancelDealAtomically(input.dealId, deal.itemId, ctx.user.id);
        } catch (err: any) {
          if (err?.message === "CANNOT_CANCEL_TERMINAL") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot cancel a completed, cancelled, or disputed deal",
            });
          }
          throw err;
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

        // Global sliding window PIN limit check (persisted in DB)
        const isGlobalLocked = await checkGlobalPinLimit(ctx.user.id);
        if (isGlobalLocked) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Global PIN limit exceeded. Your account is temporarily locked from confirming deals.",
          });
        }

        const isValid = await verifyPin(input.pin, deal.pinHash);
        if (!isValid) {
          // Record global failure in database
          await recordGlobalPinFailure(ctx.user.id, deal.itemId);

          const newAttempts = deal.pinAttempts + 1;
          await incrementPinAttempts(input.dealId);
          if (newAttempts >= 3) {
            await lockDealPin(input.dealId);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "PIN is now locked after 3 failed attempts. Raise a dispute to reset.",
            });
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Incorrect PIN. ${3 - newAttempts} attempt(s) remaining.`,
          });
        }

        // Success — clear global failures and atomically complete the deal
        await resetGlobalPinFailures(ctx.user.id);
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
        await setDealDisputed(input.dealId, ctx.user.id);
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
      .input(z.object({ dealId: z.number(), text: z.string().min(1).max(2000, "Message must be 2000 characters or fewer") }))
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
    getAllUsers: adminProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(200).default(100),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getAllUsersAdmin({ limit: input?.limit, offset: input?.offset });
      }),
    banUser: adminProcedure
      .input(z.object({ userId: z.number(), isBanned: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserBanStatus(input.userId, input.isBanned);
        await logAdminAction({
          adminId: ctx.user.id,
          action: input.isBanned ? "BAN_USER" : "UNBAN_USER",
          targetId: input.userId,
          details: input.isBanned ? `Banned user ID ${input.userId}` : `Unbanned user ID ${input.userId}`,
        });
        return { success: true };
      }),
    deleteItem: adminProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteItem(input.itemId);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "DELETE_ITEM",
          targetId: input.itemId,
          details: `Deleted item ID ${input.itemId}`,
        });
        return { success: true };
      }),
    deleteDeal: adminProcedure
      .input(z.object({ dealId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateDealStatus(input.dealId, "CANCELLED");
        await logAdminAction({
          adminId: ctx.user.id,
          action: "CANCEL_DEAL",
          targetId: input.dealId,
          details: `Cancelled deal ID ${input.dealId}`,
        });
        return { success: true };
      }),
    getReports: adminProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(200).default(100),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getAllItemReportsAdmin({ limit: input?.limit, offset: input?.offset });
      }),
    updateReportStatus: adminProcedure
      .input(
        z.object({
          reportId: z.number(),
          status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateItemReportStatus(input.reportId, input.status);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "UPDATE_REPORT_STATUS",
          targetId: input.reportId,
          details: `Updated report status to ${input.status}`,
        });
        return { success: true };
      }),
    getAuditLogs: adminProcedure.query(async () => {
      return await getAdminActions();
    }),
    getRejections: adminProcedure.query(async () => {
      return await getAllItemRejectionsAdmin();
    }),
    updateRejectionStatus: adminProcedure
      .input(
        z.object({
          rejectionId: z.number(),
          status: z.enum(["PENDING", "APPROVED", "DISMISSED"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateItemRejectionStatus(input.rejectionId, input.status);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "UPDATE_REJECTION_STATUS",
          targetId: input.rejectionId,
          details: `Updated rejection status to ${input.status}`,
        });
        return { success: true };
      }),
    approveRejection: adminProcedure
      .input(z.object({ rejectionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const newItemId = await approveRejectionAndCreateItem(input.rejectionId, ctx.user.id);
        return { success: true, itemId: newItemId };
      }),
    getDealEvents: adminProcedure.query(async () => {
      return await getAllDealEventsAdmin();
    }),
    recomputeTrustScores: adminProcedure.mutation(async ({ ctx }) => {
      const count = await recomputeAllUserTrustScores();
      await logAdminAction({
        adminId: ctx.user.id,
        action: "RECOMPUTE_TRUST_SCORES",
        targetId: 0,
        details: `Recomputed trust scores for ${count} users`,
      });
      return { success: true, count };
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
