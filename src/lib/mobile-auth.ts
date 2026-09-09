import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/session";

/**
 * Mobile clients authenticate with a bearer access token + opaque refresh
 * token pair, entirely separate from the web app's NextAuth session cookie
 * — see prisma/schema.prisma's MobileRefreshToken model and
 * src/app/api/mobile/v1/auth/*. Deliberately a different trust root
 * (MOBILE_AUTH_SECRET, not AUTH_SECRET) so a compromised mobile token can
 * never be replayed as a web session or vice versa.
 */

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

function mobileSecretKey(): Uint8Array {
  const secret = process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error("MOBILE_AUTH_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(mobileSecretKey());
  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, mobileSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The mobile-side twin of requireUserId() (src/lib/session.ts) — every
 * /api/mobile/v1/* route calls this as its sole authorization chokepoint.
 */
export async function requireMobileUserId(req: NextRequest): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError();
  }
  const userId = await verifyAccessToken(token);
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

/** A random opaque refresh token — only its hash (below) is ever persisted. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
