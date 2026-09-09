import { NextRequest, NextResponse } from "next/server";
import { requireMobileUserId } from "@/lib/mobile-auth";
import { getPreferenceCore } from "@/lib/core/preferences";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireMobileUserId(req);
    const data = await getPreferenceCore(userId);
    return NextResponse.json({ data });
  } catch (err) {
    return toApiError(err);
  }
}
