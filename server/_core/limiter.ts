import { rateLimit } from "express-rate-limit";

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
  keyGenerator: (req) => `${req.ip}-pin`,
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
  keyGenerator: (req) => `${req.ip}-otp`,
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
function extractUserIdFromBearer(req: any): string {
  try {
    const auth = req.headers?.authorization as string | undefined;
    if (auth?.startsWith("Bearer ")) {
      const payload = JSON.parse(
        Buffer.from(auth.split(".")[1], "base64").toString("utf-8")
      );
      if (payload?.sub) return `upload-user-${payload.sub}`;
    }
  } catch {
    // fall through to IP
  }
  return `upload-ip-${req.ip}`;
}

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10, // 10 uploads per 10 minutes per user
  keyGenerator: extractUserIdFromBearer,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait 10 minutes before uploading again." },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
