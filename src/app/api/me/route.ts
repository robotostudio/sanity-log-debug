import { handleError, requireAuth, success } from "@/lib/api";
import { getUserFileCount } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    const fileCount = await getUserFileCount(user.id);

    return success({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      maxSources: user.maxSources,
      fileCount,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch profile");
  }
}
