import { NextRequest, NextResponse } from "next/server";
import { requireMobileUserId } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

/**
 * Restoring a session on cold start only has a stored refresh token to go
 * on — no cached profile — so the client spends it for a fresh access
 * token via /auth/refresh and then calls this to re-derive `user`.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireMobileUserId(req);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json({ data: user });
  } catch (err) {
    return toApiError(err);
  }
}
