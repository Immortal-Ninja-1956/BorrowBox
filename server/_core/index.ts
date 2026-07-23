import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { uploadRouter } from "../upload";
import { authLimiter, pinVerifyLimiter, otpLimiter, createItemLimiter, reportLimiter, updateItemLimiter, createDealLimiter, messageLimiter, registerLimiter, reviewLimiter, disputeLimiter, publicProfileLimiter } from "./limiter";
import helmet from "helmet";
import cors from "cors";
import { runDistributedGuardedCleanupJob, getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
    throw new Error("CRITICAL: FRONTEND_URL environment variable must be set in production to secure CORS origin.");
  }

  // Configure CORS policy
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[],
      credentials: true,
    })
  );

  // Set up security headers and CSP
  // In production: strict CSP with no unsafe-inline/unsafe-eval (Vite builds pure external JS)
  // In dev: relaxed CSP because Vite HMR injects inline scripts and uses eval for source maps
  const isProd = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:", "res.cloudinary.com", "images.unsplash.com"],
          connectSrc: [
            "'self'",
            "*.supabase.co",
            "https://api.resend.com",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
          scriptSrc: isProd
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Serve uploaded images
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Image upload endpoint
  app.use(uploadRouter);

  // Rate limiting for auth endpoints
  app.set("trust proxy", 1);
  app.use("/api/trpc/auth.register", registerLimiter);
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.forgotPassword", authLimiter);
  app.use("/api/trpc/deals.confirmWithPin", pinVerifyLimiter);
  app.use("/api/trpc/user.sendWhatsAppOtp", otpLimiter);
  app.use("/api/trpc/user.getPublicProfileById", publicProfileLimiter);

  // Rate limiting for marketplace actions
  app.use("/api/trpc/items.create", createItemLimiter);
  app.use("/api/trpc/items.update", updateItemLimiter);
  app.use("/api/trpc/items.report", reportLimiter);
  app.use("/api/trpc/deals.create", createDealLimiter);
  app.use("/api/trpc/messages.send", messageLimiter);
  app.use("/api/trpc/messages.create", messageLimiter);
  app.use("/api/trpc/reviews.create", reviewLimiter);
  app.use("/api/trpc/deals.raiseDispute", disputeLimiter);

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start distributed background jobs (PostgreSQL advisory lock guarded)
    setInterval(async () => {
      try {
        await runDistributedGuardedCleanupJob();
      } catch (err) {
        console.error("[Distributed Scheduler] Unexpected error during cleanup execution:", err);
      }
    }, 15 * 60 * 1000); // Run every 15 minutes
  });
}

startServer().catch(console.error);
