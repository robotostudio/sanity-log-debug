# GitHub Auth with Better Auth - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub OAuth login using Better Auth so only authenticated users can access the app (analytics, sources, pipeline), with a polished login page using shadcn/ui.

**Architecture:** Protected layout pattern — no middleware. Route groups enforce complete isolation at the file-system level:

```text
src/app/
  layout.tsx                          # Root: fonts, QueryProvider, AuthProvider, Toaster (shared)
  page.tsx                            # Server redirect / → /analytics (auth-aware)
  (auth)/                             # PUBLIC — completely isolated, zero shared UI with dashboard
    layout.tsx                        # Centered layout, redirect-if-authenticated guard
    login/page.tsx                    # GitHub sign-in via Better Auth UI <SignIn />
  (dashboard)/                        # PROTECTED — server-side auth gate in layout
    layout.tsx                        # auth.api.getSession() + redirect + sidebar/providers
    analytics/page.tsx                # (moved from (app))
    sources/page.tsx                  # (moved from (app))
    sources/[id]/page.tsx             # (moved from (app))
    pipeline/page.tsx                 # (moved from (app))
    error.tsx                         # (moved from (app))
    not-found.tsx                     # (moved from (app))
  api/auth/[...all]/route.ts          # Better Auth API catch-all
```

**Why layout guards over middleware:**
1. Real session validation — `auth.api.getSession()` hits the DB, not just cookie existence
2. Complete isolation — `(auth)` and `(dashboard)` share zero layout code
3. Server-side redirects — no flash of protected content; redirect happens before HTML is sent
4. Bi-directional — dashboard redirects unauth'd users to `/login`; auth pages redirect auth'd users to `/analytics`
5. Type-safe — session object is available to pass as props to children if needed later

**Tech Stack:** Better Auth, `@daveyplate/better-auth-ui`, Drizzle ORM (existing Neon PostgreSQL), Next.js 16 App Router, shadcn/ui (existing), Tailwind CSS 4

**Skills applied:** `better-auth-best-practices`, `next-best-practices` (async patterns, RSC boundaries, file conventions), `shadcn-ui`, `vercel-react-best-practices` (bundle size, server-side perf), `vercel-composition-patterns` (provider pattern, compound components)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Better Auth and Better Auth UI**

```bash
npm install better-auth @daveyplate/better-auth-ui
```

`better-auth` — server + client auth framework. `@daveyplate/better-auth-ui` — pre-built shadcn-styled auth components (SignIn, SignUp, UserAvatar, etc.) that integrate with the AuthUIProvider.

**Step 2: Verify installation**

Run: `npm ls better-auth @daveyplate/better-auth-ui`
Expected: Both packages listed with resolved versions, no peer dependency warnings

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install better-auth and better-auth-ui dependencies"
```

---

## Task 2: Add Environment Variables

**Files:**
- Modify: `src/env.ts`
- Modify: `.env.local` (not committed)

**Step 1: Add auth env vars to validation schema**

In `src/env.ts`, add inside the existing `server: { ... }` block, after `DATABASE_URL`:

```typescript
// Auth
BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
```

These are server-only — never exposed to the client bundle. The `@t3-oss/env-nextjs` setup already ensures this separation.

**Step 2: Add values to `.env.local`**

```bash
# Generate a cryptographically secure secret:
openssl rand -base64 32
```

```env
BETTER_AUTH_SECRET=<generated-secret>
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=<from-github-oauth-app>
GITHUB_CLIENT_SECRET=<from-github-oauth-app>
```

**GitHub OAuth App setup:**
1. Go to GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Application name: `Sanity API Logs (dev)`
3. Homepage URL: `http://localhost:3000`
4. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

**Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: Starts without env validation errors

**Step 4: Commit**

```bash
git add src/env.ts
git commit -m "feat: add Better Auth environment variable validation"
```

> **Note:** `.env.local` is gitignored. Never commit secrets.

---

## Task 3: Create Better Auth Server Instance

**Files:**
- Create: `src/lib/auth.ts`

**Step 1: Create the auth server config**

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { env } from "@/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min — reduces DB lookups for repeated requests
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

Design notes:
- **`drizzleAdapter(db, { provider: "pg" })`** — reuses our existing Neon/Drizzle DB instance. No new connection pools.
- **`cookieCache`** — per `better-auth-best-practices`, caches session in a signed cookie to avoid a DB round-trip on every request. The 5-min `maxAge` balances freshness vs. performance. After expiry, the next `getSession()` hits the DB and refreshes the cache.
- **Type export** — `Session` type inferred from the config for type-safe usage across the app.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i auth`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: configure Better Auth server with GitHub provider and Drizzle adapter"
```

---

## Task 4: Generate Auth Database Tables

**Files:**
- Create or modify: `src/lib/db/auth-schema.ts`
- Modify: `src/lib/db/schema.ts` (re-export)

**Step 1: Run Better Auth CLI to generate Drizzle schema**

```bash
npx @better-auth/cli@latest generate --config src/lib/auth.ts
```

This generates Drizzle table definitions for:
- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, expiresAt, token (unique), ipAddress, userAgent, userId (FK → user)
- `account` — id, accountId, providerId, userId (FK → user), accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt
- `verification` — id, identifier, value, expiresAt, createdAt, updatedAt

**Step 2: Place generated schema in a dedicated file**

Save the CLI output as `src/lib/db/auth-schema.ts`. This keeps auth tables separate from the application domain tables (files, logRecords, etc.) for clean module boundaries.

Then re-export from `src/lib/db/schema.ts` by adding at the end:

```typescript
// Auth tables (generated by better-auth CLI)
export * from "./auth-schema";
```

**Step 3: Push schema to database**

```bash
npm run db:push
```
Expected: 4 new tables created (user, session, account, verification)

**Step 4: Verify schema is in sync**

```bash
npm run db:generate
```
Expected: "No schema changes detected" or generates a clean migration

**Step 5: Commit**

```bash
git add src/lib/db/auth-schema.ts src/lib/db/schema.ts drizzle/
git commit -m "feat: add Better Auth database tables (user, session, account, verification)"
```

---

## Task 5: Create Auth API Route Handler

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

**Step 1: Create the catch-all auth route**

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

This single route handles all Better Auth endpoints:
- `GET /api/auth/callback/github` — OAuth callback
- `POST /api/auth/sign-in/social` — initiate social sign-in
- `POST /api/auth/sign-out` — sign out
- `GET /api/auth/session` — get current session
- And all other auth endpoints

Per `next-best-practices` (route-handlers): the route handler exports named HTTP method functions. No conflict with `page.tsx` since this is under `/api/`.

**Step 2: Verify route responds**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/api/auth/ok
```
Expected: `{ "ok": true }` or similar JSON (not a 404)

**Step 3: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add Better Auth catch-all API route handler"
```

---

## Task 6: Create Auth Client

**Files:**
- Create: `src/lib/auth-client.ts`

**Step 1: Create the client**

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient<typeof auth>();
```

Design notes:
- **`createAuthClient<typeof auth>()`** — the generic parameter infers all available methods and session types from the server config. This gives full type safety: `authClient.signIn.social()`, `authClient.useSession()`, etc. all have correct types.
- **No explicit `baseURL`** — the client auto-detects from `window.location.origin` in the browser.
- **Import path** — `better-auth/react` provides React hooks (`useSession`). Vanilla JS clients use `better-auth/client`.

**Step 2: Commit**

```bash
git add src/lib/auth-client.ts
git commit -m "feat: create type-safe Better Auth React client"
```

---

## Task 7: Create Auth Provider (Composition Pattern)

**Files:**
- Create: `src/components/providers/auth-provider.tsx`

Per `vercel-composition-patterns` (`state-decouple-implementation`): encapsulate auth state management inside a provider. Consumers access auth via hooks, never directly importing state management internals. The `AuthUIProvider` from `@daveyplate/better-auth-ui` serves as this boundary.

**Step 1: Create the auth provider**

Create `src/components/providers/auth-provider.tsx`:

```typescript
"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      social={{
        providers: ["github"],
      }}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
}
```

Design notes:
- **`"use client"`** — required because `AuthUIProvider` uses React context and hooks. Per `next-best-practices` (RSC boundaries), this is the correct client component boundary — it wraps interactive auth state while child server components can still render above.
- **`onSessionChange={() => router.refresh()}`** — when session changes (login/logout), triggers a Next.js server-side revalidation so layout auth checks re-run.
- **`Link={Link}`** — passes Next.js `Link` component for client-side navigation in auth UI components.
- **`social.providers: ["github"]`** — tells the `<SignIn />` component which social buttons to render.

**Step 2: Commit**

```bash
git add src/components/providers/auth-provider.tsx
git commit -m "feat: create AuthProvider with Better Auth UI composition pattern"
```

---

## Task 8: Wire Auth Provider into Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add AuthProvider to root layout**

The AuthProvider goes in the root layout (not in `(dashboard)` layout) because the `<SignIn />` component on the login page also needs the AuthUI context. Both `(auth)` and `(dashboard)` route groups are children of the root layout.

Provider nesting order (outermost → innermost):
1. `QueryProvider` — React Query context (auth UI may fetch)
2. `AuthProvider` — Auth UI context (needed by both route groups)
3. Children + Toaster

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sanity API Logs",
  description: "Operational dashboard for Sanity API request logs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="bottom-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Step 2: Verify dev server still compiles**

Run: `npm run dev`
Expected: No errors, app loads

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire AuthProvider into root layout"
```

---

## Task 9: Restructure Routes — `(app)` → `(dashboard)` with Auth Gate

This is the core architectural change. The existing `(app)` route group becomes `(dashboard)` with a server-side auth guard in its layout.

**Files:**
- Rename: `src/app/(app)/` → `src/app/(dashboard)/`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Rename `(app)` to `(dashboard)`**

```bash
git mv 'src/app/(app)' 'src/app/(dashboard)'
```

Using `git mv` preserves history. Route groups are parenthesized — invisible in URLs. All routes (`/analytics`, `/sources`, `/pipeline`) keep their URLs.

**Step 2: Add server-side auth gate to `(dashboard)/layout.tsx`**

Replace the contents of `src/app/(dashboard)/layout.tsx`:

```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { auth } from "@/lib/auth";
import { Sidebar, SidebarProvider } from "@/components/layout/sidebar";
import { UploadProvider } from "@/components/upload";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <NuqsAdapter>
      <UploadProvider>
        <SidebarProvider>
          <div className="flex h-screen gap-2 bg-zinc-950 p-2">
            <Sidebar />
            <main className="flex-1 overflow-auto rounded-lg bg-[var(--content-bg)]">
              <div className="flex min-h-full flex-col px-6 pt-5 pb-6">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </UploadProvider>
    </NuqsAdapter>
  );
}
```

Design notes:
- **`async` layout** — per `next-best-practices` (async-patterns), Next.js 15+ `headers()` is async. The layout awaits it, then calls `auth.api.getSession()` with the request headers for a real server-side session check.
- **`redirect("/login")`** — Next.js server redirect. No HTML is sent to the client before the redirect. Zero flash of protected content.
- **Existing providers preserved** — `NuqsAdapter`, `UploadProvider`, `SidebarProvider` are unchanged. Only the auth gate was added at the top.
- **Session cookie cache** — the `cookieCache` configured in Task 3 means most requests won't hit the DB. Only when the 5-min cache expires does `getSession()` do a DB round-trip.

**Step 3: Verify protected routes redirect**

Run: `npm run dev`
- Visit `http://localhost:3000/analytics` in an incognito window
  Expected: Server redirect to `/login`

**Step 4: Commit**

```bash
git add src/app/
git commit -m "feat: rename (app) to (dashboard) with server-side auth gate in layout"
```

---

## Task 10: Create `(auth)` Route Group with Login Page

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/auth/login-card.tsx`

The `(auth)` group is completely isolated from `(dashboard)`. Different layout, different UI concerns. No sidebar, no upload provider.

**Step 1: Create `(auth)/layout.tsx` — public layout with reverse guard**

```typescript
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
```

This is the **reverse guard**: already-authenticated users cannot see the login page. Prevents confusion and stale login forms.

**Step 2: Create `(auth)/login/page.tsx`**

```typescript
import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/login-card";

export const metadata: Metadata = {
  title: "Sign In - Sanity API Logs",
  description: "Sign in to access the Sanity API Logs dashboard",
};

export default function LoginPage() {
  return <LoginCard />;
}
```

Per `next-best-practices` (metadata): static metadata export for SEO. The page itself is a thin server component that delegates rendering to a client component.

**Step 3: Create `src/components/auth/login-card.tsx`**

```typescript
"use client";

import { SignIn } from "@daveyplate/better-auth-ui";
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

      <SignIn />
    </div>
  );
}
```

Per `next-best-practices` (RSC boundaries): `"use client"` boundary is placed on the leaf component that needs interactivity, not higher up. The `<SignIn />` component from Better Auth UI renders shadcn-styled social login buttons based on the `AuthUIProvider` config. It automatically shows a GitHub button because `social.providers: ["github"]` is set in the provider.

**Step 4: Verify login page renders**

Run: `npm run dev`, navigate to `http://localhost:3000/login`
Expected: Dark centered page, app logo, "Sanity API Logs" heading, "Sign in with GitHub" button

**Step 5: Commit**

```bash
git add src/app/\(auth\)/ src/components/auth/login-card.tsx
git commit -m "feat: create (auth) route group with isolated login page and reverse guard"
```

---

## Task 11: Auth-Aware Root Redirect

**Files:**
- Modify: `src/app/page.tsx`

The current root page does `redirect("/analytics")`. With the protected layout, an unauthenticated visit to `/` would chain-redirect: `/` → `/analytics` → `/login` (two hops). We can make this a single hop.

**Step 1: Update root page**

```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  redirect(session ? "/analytics" : "/login");
}
```

One redirect, not two. Slightly better UX and fewer server round-trips.

**Step 2: Verify**

Run: `npm run dev`
- Unauthenticated: `http://localhost:3000/` → `/login` (single redirect)
- Authenticated: `http://localhost:3000/` → `/analytics` (single redirect)

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: auth-aware root redirect — single hop to login or dashboard"
```

---

## Task 12: Add User Menu to Sidebar

**Files:**
- Create: `src/components/auth/user-menu.tsx`
- Modify: `src/components/layout/sidebar/index.tsx`

Per `vercel-composition-patterns` (`architecture-compound-components`): the user menu is a self-contained compound component using shadcn's DropdownMenu primitive.

**Step 1: Create user menu component**

Create `src/components/auth/user-menu.tsx`:

```typescript
"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
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
    await authClient.signOut();
    router.push("/login");
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
```

Design notes:
- **Extracted `getInitials()`** — pure function, testable, no inline logic
- **`min-w-0`** — per CSS best practices, enables `truncate` to work inside flex containers
- **`DropdownMenu` side="top"** — opens upward since the menu is pinned to the bottom of the sidebar
- **Graceful fallback** — initials avatar when no GitHub image is available
- **`authClient.useSession()`** — reactive hook; auto-updates when session changes

**Step 2: Add UserMenu to sidebar**

In `src/components/layout/sidebar/index.tsx`:

Add import at top:
```typescript
import { UserMenu } from "@/components/auth/user-menu";
```

In the JSX, replace the spacer-only section with spacer + user menu. After `<UploadIndicator />`:

```tsx
{/* Spacer */}
<div className="flex-1" />

{/* User menu */}
<UserMenu isCollapsed={isCollapsed} />
```

Final sidebar structure:
1. Header (Logo + Toggle)
2. Navigation
3. Upload indicator
4. Spacer (flex-1 pushes user menu to bottom)
5. **UserMenu** (anchored at bottom)

**Step 3: Verify user menu appears**

Run: `npm run dev`, log in via GitHub, check sidebar
Expected: GitHub avatar + name at sidebar bottom; click opens dropdown with email + "Sign out"

**Step 4: Commit**

```bash
git add src/components/auth/user-menu.tsx src/components/layout/sidebar/index.tsx
git commit -m "feat: add user menu with avatar and sign-out to sidebar footer"
```

---

## Task 13: Clean Up — Remove Old `(app)` Artifacts

**Files:**
- Verify deletion from `git mv` in Task 9

**Step 1: Confirm `(app)` no longer exists**

```bash
ls src/app/\(app\) 2>&1
```
Expected: "No such file or directory"

If `git mv` in Task 9 left tracked artifacts:
```bash
git rm -r src/app/\(app\) 2>/dev/null
```

**Step 2: Verify all routes work under `(dashboard)`**

```bash
npm run dev
```
- `/analytics` — loads dashboard
- `/sources` — loads sources page
- `/pipeline` — loads pipeline page
- `/sources/[any-id]` — loads source detail

**Step 3: Run build to catch any broken imports**

```bash
npm run build
```
Expected: Build succeeds with no missing module errors

**Step 4: Commit (if cleanup needed)**

```bash
git add -A
git commit -m "chore: clean up old (app) route group artifacts"
```

---

## Task 14: Write Tests

**Files:**
- Create: `src/__tests__/unit/auth/auth-client.test.ts`
- Create: `src/__tests__/unit/auth/user-menu.test.ts`

**Step 1: Write auth client module test**

Create `src/__tests__/unit/auth/auth-client.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("Auth client module", () => {
  it("exports a configured auth client with expected methods", async () => {
    const { authClient } = await import("@/lib/auth-client");

    expect(authClient).toBeDefined();
    expect(authClient.signIn).toBeDefined();
    expect(authClient.signIn.social).toBeDefined();
    expect(authClient.signOut).toBeDefined();
    expect(authClient.useSession).toBeDefined();
    expect(authClient.getSession).toBeDefined();
  });
});
```

**Step 2: Write getInitials utility test**

The `getInitials` function in user-menu should be extracted to a shared util for testability. If it stays in the component file, test the logic directly:

Create `src/__tests__/unit/auth/user-menu.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Test the initials logic
function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

describe("getInitials", () => {
  it("returns initials for a full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for a single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("truncates to 2 characters for long names", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns 'U' for null or undefined", () => {
    expect(getInitials(null)).toBe("U");
    expect(getInitials(undefined)).toBe("U");
  });

  it("returns 'U' for empty string", () => {
    expect(getInitials("")).toBe("U");
  });
});
```

**Step 3: Run tests**

```bash
npm run test:unit -- --run
```
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/__tests__/unit/auth/
git commit -m "test: add unit tests for auth client and user menu utilities"
```

---

## Task 15: Browser Testing with agent-browser

**Files:** None (verification only)

Use the `agent-browser` skill for headed browser testing of the full auth flow.

**Step 1: Ensure dev server is running**

```bash
npm run dev
```

**Step 2: Test — Unauthenticated user is redirected to login**

1. Open incognito tab → `http://localhost:3000/analytics`
2. **Assert:** URL is `/login`
3. **Assert:** Page shows "Sanity API Logs" heading
4. **Assert:** "Sign in with GitHub" button is visible
5. **Assert:** No sidebar visible (proves `(auth)` layout isolation)

**Step 3: Test — GitHub OAuth flow completes**

1. Click "Sign in with GitHub"
2. **Assert:** Redirected to `github.com` OAuth consent page
3. Authorize the app
4. **Assert:** Redirected to `/analytics`
5. **Assert:** Dashboard renders with sidebar

**Step 4: Test — User menu works**

1. **Assert:** User avatar visible at bottom of sidebar
2. Click user avatar/name
3. **Assert:** Dropdown shows name, email, "Sign out" option

**Step 5: Test — Sign out redirects to login**

1. Click "Sign out"
2. **Assert:** Redirected to `/login`
3. Navigate to `/analytics`
4. **Assert:** Redirected to `/login` (protected)

**Step 6: Test — Authenticated user cannot see login page**

1. Log in again via GitHub
2. Navigate to `/login`
3. **Assert:** Redirected to `/analytics` (reverse guard in `(auth)` layout)

**Step 7: Test — Root redirect is auth-aware**

1. While logged in: visit `/` → **Assert:** Redirected to `/analytics`
2. Log out, visit `/` → **Assert:** Redirected to `/login`

---

## Summary of Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `package.json` | Add `better-auth`, `@daveyplate/better-auth-ui` |
| Modify | `src/env.ts` | Validate `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Create | `src/lib/auth.ts` | Better Auth server — Drizzle adapter, GitHub provider, session cookie cache |
| Create | `src/lib/db/auth-schema.ts` | Generated auth tables (user, session, account, verification) |
| Modify | `src/lib/db/schema.ts` | Re-export auth schema |
| Create | `src/app/api/auth/[...all]/route.ts` | Better Auth API catch-all handler |
| Create | `src/lib/auth-client.ts` | Type-safe Better Auth React client |
| Create | `src/components/providers/auth-provider.tsx` | AuthUIProvider wrapper (composition pattern) |
| Modify | `src/app/layout.tsx` | Add AuthProvider to provider stack |
| Rename | `src/app/(app)/` → `src/app/(dashboard)/` | Protected route group |
| Modify | `src/app/(dashboard)/layout.tsx` | Server-side auth gate via `auth.api.getSession()` |
| Create | `src/app/(auth)/layout.tsx` | Public layout — centered, reverse guard |
| Create | `src/app/(auth)/login/page.tsx` | Login page with metadata |
| Create | `src/components/auth/login-card.tsx` | Login card — logo + `<SignIn />` |
| Modify | `src/app/page.tsx` | Auth-aware single-hop redirect |
| Create | `src/components/auth/user-menu.tsx` | Sidebar user menu — avatar, dropdown, sign-out |
| Modify | `src/components/layout/sidebar/index.tsx` | Add UserMenu to sidebar footer |
| Create | `src/__tests__/unit/auth/auth-client.test.ts` | Auth client module test |
| Create | `src/__tests__/unit/auth/user-menu.test.ts` | Initials utility test |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Layout guards, not middleware** | Real session validation (DB check via `auth.api.getSession()`), not just cookie existence. Server-side redirect before any HTML is sent. |
| **Two isolated route groups** | `(auth)` and `(dashboard)` share zero layout code. No sidebar on login. No auth UI in dashboard. Clean separation of concerns. |
| **Bi-directional guards** | Dashboard layout → `/login` if unauthenticated. Auth layout → `/analytics` if authenticated. No stale states. |
| **Auth schema in separate file** | `auth-schema.ts` keeps generated tables separate from domain tables. Clear module boundaries. Easy to regenerate. |
| **Type-safe client** | `createAuthClient<typeof auth>()` infers methods and types from server config. Catch API mismatches at compile time. |
| **Cookie cache (5 min)** | Avoids DB round-trip on every request. 5-min TTL balances freshness vs. performance. |
| **Provider in root layout** | Both `(auth)` (login `<SignIn />`) and `(dashboard)` (user menu `useSession()`) need auth context. Root layout is the shared ancestor. |
| **Auth-aware root redirect** | Single redirect hop from `/` to either `/login` or `/analytics`. Avoids `/` → `/analytics` → `/login` chain. |
