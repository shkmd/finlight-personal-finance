import { Prisma } from "@prisma/client";
import { UnauthorizedError } from "@/lib/session";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail(err.message);
    }
    // A raw foreign-key violation means some other record still references
    // this one. Every "hard delete" action in this app has financial history
    // that should be archived rather than destroyed, so this is a safety net
    // for any relation a specific action's own pre-check didn't anticipate —
    // it should never leak a raw database error to the user.
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2003" || err.code === "P2014")) {
      return fail("This record is still referenced by other data (transactions, payments, or history) — remove or reassign those first, or archive instead of deleting.");
    }
    if (err instanceof Error) {
      return fail(err.message);
    }
    return fail("Something went wrong. Please try again.");
  }
}
