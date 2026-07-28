import { rateLimit, ipKeyGenerator } from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many login attempts. Please try again after 15 minutes.",
      code: -32005,
      data: {
        code: "TOO_MANY_REQUESTS",
        httpStatus: 429,
      },
    },
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const pinVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 attempts per hour per IP
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || "127.0.0.1")}-pin`,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many PIN attempts. Please try again after 1 hour.",
      code: -32005,
      data: {
        code: "TOO_MANY_REQUESTS",
        httpStatus: 429,
      },
    },
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 3, // 3 attempts per 10 minutes per IP
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || "127.0.0.1")}-otp`,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many OTP requests. Please try again after 10 minutes.",
      code: -32005,
      data: {
        code: "TOO_MANY_REQUESTS",
        httpStatus: 429,
      },
    },
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

// Extract user ID from a Bearer JWT without verifying — only used as a rate-limit key.
// A full cryptographic verification happens inside the upload handler itself.
function extractUserIdFromBearer(req: any, prefix: string): string {
  try {
    const auth = req.headers?.authorization as string | undefined;
    if (auth?.startsWith("Bearer ")) {
      const payload = JSON.parse(
        Buffer.from(auth.split(".")[1], "base64").toString("utf-8")
      );
      if (payload?.sub) return `${prefix}-user-${payload.sub}`;
    }
  } catch {
    // fall through to IP
  }
  return `${prefix}-ip-${ipKeyGenerator(req.ip || "127.0.0.1")}`;
}

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 8, // 8 uploads per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "upload"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait 1 hour before uploading again." },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const createItemLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 new listings or edits per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "create-item"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many listings created or updated. Please wait an hour.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const updateItemLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 edits per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "update-item"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many edits. Please wait an hour.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 reports per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "report"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many reports submitted. Please wait an hour.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const createDealLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  limit: 20, // 20 deals per day per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "create-deal"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many deals created. Please wait 24 hours.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 messages per minute per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "message"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many messages sent. Please slow down.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 registrations per hour per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many registrations from this IP. Please try again after 1 hour.",
      code: -32005,
      data: {
        code: "TOO_MANY_REQUESTS",
        httpStatus: 429,
      },
    },
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 reviews per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "review"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many reviews submitted. Please wait an hour.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const disputeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 disputes per hour per user
  keyGenerator: (req) => extractUserIdFromBearer(req, "dispute"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many dispute requests. Please wait an hour before raising another dispute.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

export const publicProfileLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many profile requests. Please slow down.",
      code: -32005,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
