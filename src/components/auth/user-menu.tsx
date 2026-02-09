"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "U";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session?.user) return null;

  const { user } = session;

  async function handleSignOut() {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  }

  return (
    <div className="border-t border-border px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? "User avatar"}
                className="size-7 shrink-0 rounded-full"
              />
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {getInitials(user.name)}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col items-start">
                <span className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
