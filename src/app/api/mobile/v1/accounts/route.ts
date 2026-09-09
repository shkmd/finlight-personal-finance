import { NextRequest, NextResponse } from "next/server";
import { requireMobileUserId } from "@/lib/mobile-auth";
import { listAccountsCore } from "@/lib/core/accounts";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireMobileUserId(req);
    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";
    const data = await listAccountsCore(userId, includeArchived);
    return NextResponse.json({ data });
  } catch (err) {
    return toApiError(err);
  }
}
