import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * The one place email+password is checked against the database. Both the
 * web login (NextAuth's Credentials provider, src/lib/auth.ts) and the
 * mobile login endpoint (src/app/api/mobile/v1/auth/login/route.ts) call
 * this rather than each re-implementing the bcrypt/Prisma check — they
 * diverge only in what kind of session they issue afterward (a cookie vs.
 * a bearer token pair).
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  return { id: user.id, email: user.email, name: user.name };
}
