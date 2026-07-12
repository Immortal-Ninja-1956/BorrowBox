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
