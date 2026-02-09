import { useQuery } from "@tanstack/react-query";
import { meKeys } from "@/lib/query-keys";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  maxSources: number;
  fileCount: number;
}

async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Failed to fetch profile");
  const json = await res.json();
  return json.data;
}

export function useUserProfile() {
  const { data, isLoading } = useQuery({
    queryKey: meKeys.profile(),
    queryFn: fetchProfile,
    staleTime: 60_000,
  });

  return {
    profile: data,
    isAdmin: data?.role === "admin",
    role: data?.role,
    maxSources: data?.maxSources ?? 1,
    fileCount: data?.fileCount ?? 0,
    isLoading,
  };
}
