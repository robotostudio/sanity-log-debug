import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/login-card";

export const metadata: Metadata = {
  title: "Sign In - Sanity API Logs",
  description: "Sign in to access the Sanity API Logs dashboard",
};

export default function LoginPage() {
  return <LoginCard />;
}
