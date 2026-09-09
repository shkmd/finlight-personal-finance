import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/actions/auth";
import { toApiError } from "@/app/api/mobile/v1/_lib/errors";

/**
 * registerUser (src/lib/actions/auth.ts) has no requireUserId()/revalidatePath
 * call — it's a pre-login action already — so it's called directly here
 * with no core-extraction split needed, unlike the authenticated routes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await registerUser(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: { registered: true } }, { status: 201 });
  } catch (err) {
    return toApiError(err);
  }
}
