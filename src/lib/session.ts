import "server-only";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do this.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Every server action and route handler that touches financial data must
 * call this first. It is the single ownership-check chokepoint: no query
 * anywhere in the app should trust a userId that didn't come from here.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}
