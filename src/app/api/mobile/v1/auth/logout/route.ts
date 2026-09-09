import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashRefreshToken } from "@/lib/mobile-auth";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

const logoutSchema = z.object({ refreshToken: z.string().min(1) });

/** Idempotent by design: logging out twice, or with an already-expired token, is still a success from the client's point of view. */
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = logoutSchema.parse(await req.json());
    await prisma.mobileRefreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ data: { loggedOut: true } });
  } catch (err) {
    return toApiError(err);
  }
}
