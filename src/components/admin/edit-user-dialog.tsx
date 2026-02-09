"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminKeys } from "@/lib/query-keys";
import type { AdminUser } from "./admin-users-page";

interface EditUserDialogProps {
  user: AdminUser | null;
  onClose: () => void;
}

export function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  const [role, setRole] = useState<"user" | "admin">("user");
  const [maxSources, setMaxSources] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setMaxSources(String(user.maxSources));
    }
  }, [user]);

  const userId = user?.id;

  const mutation = useMutation({
    mutationFn: async (data: { role: string; maxSources: number }) => {
      if (!userId) throw new Error("No user selected");
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(maxSources, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      setError("Max sources must be between 1 and 100");
      return;
    }
    setError(null);
    mutation.mutate({ role, maxSources: parsed });
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update role and source limits for {user?.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxSources">Max Sources</Label>
            <Input
              id="maxSources"
              type="number"
              min={1}
              max={100}
              value={maxSources}
              onChange={(e) => setMaxSources(e.target.value)}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
