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
        httpStatus: 429
      }
    }
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});
