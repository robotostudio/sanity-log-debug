import { eq } from "drizzle-orm";
import { z } from "zod";
import { handleError, requireAdmin, success, Errors } from "@/lib/api";
import { db } from "@/lib/db";
import { userProfile } from "@/lib/db/user-profile-schema";
import { getOrCreateUserProfile } from "@/lib/auth-helpers";
import { user } from "@/lib/db/auth-schema";

const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  maxSources: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: targetUserId } = await params;

    // Verify target user exists
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
      columns: { id: true },
    });
    if (!targetUser) {
      throw Errors.notFound("User");
    }

    const body = await request.json();

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      throw Errors.validation("Invalid request body", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { role, maxSources } = validation.data;
    if (role === undefined && maxSources === undefined) {
      throw Errors.validation("At least one field (role or maxSources) is required");
    }

    // Ensure profile exists
    await getOrCreateUserProfile(targetUserId);

    // Build update
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;
    if (maxSources !== undefined) updates.maxSources = maxSources;

    await db
      .update(userProfile)
      .set(updates)
      .where(eq(userProfile.userId, targetUserId));

    const updated = await getOrCreateUserProfile(targetUserId);

    return success(updated);
  } catch (error) {
    return handleError(error, "Failed to update user");
  }
}
