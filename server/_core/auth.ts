import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    ENV.cookieSecret,
    { expiresIn: "365d" }
  );
}

export function verifySessionToken(token: string): { userId: number; email: string } | null {
  try {
    const payload = jwt.verify(token, ENV.cookieSecret) as any;
    if (!payload?.userId) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await db.getUserById(session.userId);
  return user ?? null;
}
