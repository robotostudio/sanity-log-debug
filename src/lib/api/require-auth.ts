import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getOrCreateUserProfile,
  type UserWithProfile,
} from "@/lib/auth-helpers";
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
