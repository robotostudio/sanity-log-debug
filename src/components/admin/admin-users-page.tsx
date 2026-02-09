"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { adminKeys } from "@/lib/query-keys";
import { AdminUsersTable } from "./admin-users-table";
import { Skeleton } from "@/components/ui/skeleton";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  role: "user" | "admin";
  maxSources: number;
  fileCount: number;
}

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  const json = await res.json();
  return json.data.users;
}

export function AdminUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: adminKeys.users(),
    queryFn: fetchUsers,
  });

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader title="Users" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <AdminUsersTable users={users ?? []} />
      )}
    </div>
  );
}
