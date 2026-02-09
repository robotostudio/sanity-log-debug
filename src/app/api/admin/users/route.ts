import { count, eq } from "drizzle-orm";
import { handleError, requireAdmin, success } from "@/lib/api";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { files } from "@/lib/db/logs-schema";
import { userProfile } from "@/lib/db/user-profile-schema";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch all users with profiles
    const users = await db.query.user.findMany({
      with: { profile: true },
      orderBy: (user, { desc }) => [desc(user.createdAt)],
    });

    // Count files per user in a single query
    const fileCounts = await db
      .select({ userId: files.userId, value: count() })
      .from(files)
      .groupBy(files.userId);

    const fileCountMap = new Map(
      fileCounts
        .filter((fc) => fc.userId !== null)
        .map((fc) => [fc.userId!, fc.value]),
    );

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt.toISOString(),
      role: u.profile?.role ?? "user",
      maxSources: u.profile?.maxSources ?? 1,
      fileCount: fileCountMap.get(u.id) ?? 0,
    }));

    return success({ users: result });
  } catch (error) {
    return handleError(error, "Failed to fetch users");
  }
}
