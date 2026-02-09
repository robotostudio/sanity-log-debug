"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { adminKeys } from "@/lib/query-keys";
import { AdminUsersTable } from "./admin-users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

function UsersLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function AdminUsersPage() {
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.users(),
    queryFn: fetchUsers,
  });

  const renderContent = () => {
    if (isLoading) return <UsersLoadingSkeleton />;

    if (error) {
      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-destructive">Failed to load users.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    return <AdminUsersTable users={users ?? []} />;
  };

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader title="Users" />
      {renderContent()}
    </div>
  );
}
