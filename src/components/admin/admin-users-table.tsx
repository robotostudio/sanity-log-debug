"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "./admin-users-page";
import { EditUserDialog } from "./edit-user-dialog";

interface AdminUsersTableProps {
  users: AdminUser[];
}

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Sources</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="size-8 rounded-full"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                      {user.name?.trim()?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-zinc-300">
                  {user.fileCount}/{user.maxSources}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditUser(user)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
    </>
  );
}
