import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  getOrCreateUserProfile,
  type UserWithProfile,
} from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { uploadSessions, files } from "@/lib/db/schema";
import { Errors } from "./api-errors";

/**
 * Require authenticated user. Returns user with profile.
 * Throws 401 if no session.
 */
export async function requireAuth(): Promise<UserWithProfile> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw Errors.unauthorized();
  }

  return getOrCreateUserProfile(session.user.id);
}

/**
 * Require authenticated admin user.
 * Throws 401 if no session, 403 if not admin.
 */
export async function requireAdmin(): Promise<UserWithProfile> {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw Errors.forbidden();
  }

  return user;
}

/**
 * Require authenticated user who owns the upload session.
 * Ownership is verified via the linked file's userId.
 * Admins bypass ownership check. Returns 404 (not 403) for unauthorized access.
 */
export async function requireSessionOwner(sessionId: string): Promise<{
  user: UserWithProfile;
  session: typeof uploadSessions.$inferSelect;
}> {
  const user = await requireAuth();

  const session = await db.query.uploadSessions.findFirst({
    where: eq(uploadSessions.id, sessionId),
  });
  if (!session) throw Errors.notFound("Upload session");

  // Admin bypass
  if (user.role === "admin") return { user, session };

  // Check userId directly on session (new sessions have it set)
  if (session.userId) {
    if (session.userId !== user.id) throw Errors.notFound("Upload session");
    return { user, session };
  }

  // Fallback: check via linked file for older sessions without userId
  if (!session.fileId) throw Errors.notFound("Upload session");

  const file = await db.query.files.findFirst({
    where: eq(files.id, session.fileId),
    columns: { userId: true },
  });
  if (file?.userId !== user.id) {
    throw Errors.notFound("Upload session");
  }

  return { user, session };
}
