import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { verifyCredentials } from "@/lib/auth-core";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} from "@/lib/mobile-auth";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);
    const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 200) : null;

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { token: accessToken, expiresIn } = await signAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    await prisma.mobileRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        deviceLabel,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ data: { accessToken, refreshToken, expiresIn, user } });
  } catch (err) {
    return toApiError(err);
  }
}
