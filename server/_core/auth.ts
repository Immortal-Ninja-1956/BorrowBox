import type { Request } from "express";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import * as cookie from "cookie";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";

// Initialize the Supabase backend client.
// The anon key is sufficient here — we only need to verify the user's JWT.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in your Render.com Dashboard (Environment tab)."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * The only email domain permitted on this platform.
 *
 * This constant is enforced server-side on EVERY authenticated request.
 * The client also validates this in Register.tsx, but that check can be
 * bypassed trivially by calling the Supabase public API directly with
 * any email. This server-side guard ensures that even a valid Supabase
 * JWT issued to a non-VIT email will never produce a local user record
 * and will be rejected by every protectedProcedure on this server.
 */
const ALLOWED_EMAIL_DOMAIN = "@vitstudent.ac.in";

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  // 1. Extract Bearer token from either Authorization header or cookie
  let token: string | undefined;

  // Try extracting from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Fallback: extract from cookie
  if (!token && req.headers.cookie) {
    try {
      const parsedCookies = cookie.parse(req.headers.cookie);
      token = parsedCookies["sb-access-token"];
    } catch (err) {
      console.error("[Auth] Error parsing request cookies:", err);
    }
  }

  // If a token is asserted, we MUST verify it. Fail-closed.
  if (token) {
    // Check if token has been revoked (e.g., via logout)
    const tokenHash = hashToken(token);
    if (await db.isTokenRevoked(tokenHash)) {
      console.warn("[Auth] Rejected revoked token attempt");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Session token has been revoked",
      });
    }

    try {
      // 2. Verify token with Supabase
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !authUser || !authUser.email) {
        console.warn(`[Auth] Supabase token verification failed: ${error?.message || "No user payload"}`);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error?.message || "Invalid or expired session token",
        });
      }

      // 3. Server-side domain restriction ───────────────────────────────────────
      // Reject any Supabase-verified user whose email is not from the allowed
      // domain. This is the server-side counterpart to the client-side check in
      // Register.tsx. It guards against anyone who calls supabase.auth.signUp()
      // directly using the public anon key (which is embedded in every page load).
      if (!isAllowedEmail(authUser.email)) {
        console.warn(`[Auth] Blocked non-VIT email: ${authUser.email}`);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only VIT student emails are permitted on this platform.",
        });
      }
      // ─────────────────────────────────────────────────────────────────────────

      // 4. Look up local DB user record
      let user = await db.getUserByEmail(authUser.email);

      // 5. Auto-create local record on first sign-in via Supabase.
      //    The domain check above guarantees only @vitstudent.ac.in reaches here.
      if (!user) {
        const userId = await db.createUser({
          email: authUser.email,
          passwordHash: "", // Supabase is now the password authority
          name:
            authUser.user_metadata?.full_name ||
            authUser.email.split("@")[0],
        });
        // Mark as verified — Supabase already enforced email confirmation
        await db.verifyUserEmail(userId);
        user = await db.getUserById(userId);
      }

      // 6. Reject banned users
      if (!user || user.isBanned === 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account has been banned.",
        });
      }

      return user ?? null;
    } catch (err) {
      if (err instanceof TRPCError) {
        throw err;
      }
      console.error("[Auth] Transient or network error during authentication verification:", err);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication service is currently unavailable.",
      });
    }
  }

  // If no token was asserted, we proceed as guest
  return null;
}
