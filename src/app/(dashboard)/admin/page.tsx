import type { Metadata } from "next";
import { AdminUsersPage } from "@/components/admin/admin-users-page";

export const metadata: Metadata = {
  title: "Admin — Users",
};

export default function AdminPage() {
  return <AdminUsersPage />;
}
