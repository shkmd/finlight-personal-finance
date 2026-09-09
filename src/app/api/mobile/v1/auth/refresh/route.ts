import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} from "@/lib/mobile-auth";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

/**
 * Rotates the refresh token on every use (deletes the presented one, issues
 * a new one) rather than reusing it — if a stolen token is ever replayed
 * after the legitimate client has already rotated past it, the stolen
 * one's lookup fails and the theft is at least contained to one use.
 */
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = refreshSchema.parse(await req.json());
    const tokenHash = hashRefreshToken(refreshToken);

    const existing = await prisma.mobileRefreshToken.findUnique({ where: { tokenHash } });
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      return NextResponse.json({ error: "Refresh token is invalid or expired. Please sign in again." }, { status: 401 });
    }

    const newRefreshToken = generateRefreshToken();
    await prisma.$transaction([
      prisma.mobileRefreshToken.delete({ where: { id: existing.id } }),
      prisma.mobileRefreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: hashRefreshToken(newRefreshToken),
          deviceLabel: existing.deviceLabel,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const { token: accessToken, expiresIn } = await signAccessToken(existing.userId);
    return NextResponse.json({ data: { accessToken, refreshToken: newRefreshToken, expiresIn } });
  } catch (err) {
    return toApiError(err);
  }
}
