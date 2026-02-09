import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/analytics");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      {children}
    </div>
  );
}
