import { NextRequest, NextResponse } from "next/server";
import { requireMobileUserId } from "@/lib/mobile-auth";
import { getDashboardSummaryCore } from "@/lib/core/dashboard";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireMobileUserId(req);
    const yearParam = req.nextUrl.searchParams.get("year");
    const monthParam = req.nextUrl.searchParams.get("month");
    const target = yearParam && monthParam ? { year: Number(yearParam), month: Number(monthParam) } : undefined;
    const data = await getDashboardSummaryCore(userId, target);
    return NextResponse.json({ data });
  } catch (err) {
    return toApiError(err);
  }
}
