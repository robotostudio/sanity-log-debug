import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfile } from "@/lib/db/user-profile-schema";
import { files } from "@/lib/db/logs-schema";

export interface UserWithProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  maxSources: number;
}

/**
 * Get or create a user profile. On first call for a user, inserts a default profile.
 * Returns the merged user + profile data.
 */
export async function getOrCreateUserProfile(
  userId: string,
): Promise<UserWithProfile> {
  // Upsert: insert if not exists, do nothing on conflict
  await db
    .insert(userProfile)
    .values({ userId })
    .onConflictDoNothing({ target: userProfile.userId });

  // Fetch user with profile
  const result = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
    with: { profile: true },
  });

  if (!result || !result.profile) {
    throw new Error(`User profile not found for userId: ${userId}`);
  }

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    image: result.image,
    role: result.profile.role,
    maxSources: result.profile.maxSources,
  };
}

/**
 * Lightweight admin role check — avoids fetching full profile.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
    columns: { role: true },
  });
  return profile?.role === "admin";
}

/**
 * Count files owned by a user.
 */
export async function getUserFileCount(userId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(files)
    .where(eq(files.userId, userId));
  return result[0]?.value ?? 0;
}
