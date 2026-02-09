"use client";

import { AuthView } from "@daveyplate/better-auth-ui";
import { LogoIcon } from "@/components/icons";

export function LoginCard() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-3">
        <LogoIcon className="h-8 w-8 text-white" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Sanity API Logs
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the dashboard
          </p>
        </div>
      </div>

      <AuthView view="SIGN_IN" />
    </div>
  );
}
