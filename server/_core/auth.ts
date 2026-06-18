import type { Request } from "express";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase backend client
// We use the anon key here because we only need to decode the user's provided JWT.
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function authenticateRequest(req: Request): Promise<User | null> {
  // Extract token from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];

  // Verify token with Supabase
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !authUser || !authUser.email) {
    return null;
  }

  // Find the user in our local DB
  let user = await db.getUserByEmail(authUser.email);

  // Auto-create user record if they just signed up via Supabase
  if (!user) {
    const userId = await db.createUser({
      email: authUser.email,
      passwordHash: "", // Supabase handles passwords now
      name: authUser.user_metadata?.full_name || authUser.email.split("@")[0],
    });
    // Immediately mark as verified since Supabase enforces it
    await db.verifyUserEmail(userId);
    user = await db.getUserById(userId);
  }

  if (!user || user.isBanned === 1) {
    return null;
  }

  return user || null;
}
