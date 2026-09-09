import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { UnauthorizedError } from "@/lib/session";

/**
 * Mirrors runAction's (src/lib/actions/action-result.ts) error-handling
 * decisions, but surfaces them as HTTP status codes + JSON instead of an
 * ActionResult union, since a mobile client is a plain HTTP caller.
 */
export function toApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input.", issues: err.issues }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2003" || err.code === "P2014")) {
    return NextResponse.json(
      {
        error:
          "This record is still referenced by other data (transactions, payments, or history) — remove or reassign those first, or archive instead of deleting.",
      },
      { status: 409 }
    );
  }
  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
