# SWR to TanStack Query Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace SWR with TanStack Query v5, adding optimistic updates, suspense support, and query key factories.

**Architecture:** Create centralized QueryClient configuration with query key factories. Migrate 6 files from SWR to TanStack Query hooks. Use useMutation with optimistic updates for delete operations.

**Tech Stack:** @tanstack/react-query v5, @tanstack/react-query-devtools

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install TanStack Query packages**

Run:
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

**Step 2: Remove SWR**

Run:
```bash
pnpm remove swr
```

**Step 3: Verify installation**

Run: `pnpm list @tanstack/react-query`
Expected: Shows @tanstack/react-query version 5.x

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace swr with @tanstack/react-query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Query Client Configuration

**Files:**
- Create: `src/lib/query-client.ts`

**Step 1: Create the query client file**

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: (failureCount, error) => {
        if (error instanceof Response && error.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Step 2: Verify file created**

Run: `cat src/lib/query-client.ts`
Expected: File contents shown

**Step 3: Commit**

```bash
git add src/lib/query-client.ts
git commit -m "feat: add QueryClient configuration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Query Key Factories

**Files:**
- Create: `src/lib/query-keys.ts`

**Step 1: Create query key factory file**

```typescript
export const fileKeys = {
  all: ["files"] as const,
  lists: () => [...fileKeys.all, "list"] as const,
  list: () => fileKeys.lists(),
  details: () => [...fileKeys.all, "detail"] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

export const logKeys = {
  all: ["logs"] as const,
  lists: () => [...logKeys.all, "list"] as const,
  list: (params: Record<string, string>) =>
    [...logKeys.lists(), params] as const,
  aggregations: () => [...logKeys.all, "aggregations"] as const,
  aggregation: (fileKey: string, filters?: string) =>
    [...logKeys.aggregations(), fileKey, filters] as const,
};

export const processingKeys = {
  all: ["processing"] as const,
  stats: () => [...processingKeys.all, "stats"] as const,
};
```

**Step 2: Verify file created**

Run: `cat src/lib/query-keys.ts`
Expected: File contents shown

**Step 3: Commit**

```bash
git add src/lib/query-keys.ts
git commit -m "feat: add query key factories for cache management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add QueryClientProvider to App Layout

**Files:**
- Modify: `src/app/layout.tsx` or root provider file
- Create: `src/components/providers/query-provider.tsx`

**Step 1: Create QueryProvider component**

```typescript
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { queryClient } from "@/lib/query-client";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

**Step 2: Find and update root layout**

Look for the root layout file that wraps the app providers.

**Step 3: Add QueryProvider to provider hierarchy**

Wrap existing providers with QueryProvider (should be near the root).

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/providers/query-provider.tsx src/app/layout.tsx
git commit -m "feat: add QueryClientProvider to app root

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Migrate use-sources.ts

**Files:**
- Modify: `src/components/sources/use-sources.ts`

**Step 1: Replace SWR imports with TanStack Query**

Replace:
```typescript
import useSWR, { mutate } from "swr";
```

With:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fileKeys } from "@/lib/query-keys";
```

**Step 2: Replace useSWR with useQuery**

Replace the main data fetch:
```typescript
const { data, isLoading, error } = useSWR<{ files: Source[] }>(
  FILES_API_ENDPOINT,
  apiFetcher,
);
```

With:
```typescript
const { data, isPending, error } = useQuery({
  queryKey: fileKeys.list(),
  queryFn: () => apiFetcher<{ files: Source[] }>(FILES_API_ENDPOINT),
});
```

**Step 3: Replace polling SWR with refetchInterval**

Remove the second useSWR call and add refetchInterval to the main query:
```typescript
const { data, isPending, error } = useQuery({
  queryKey: fileKeys.list(),
  queryFn: () => apiFetcher<{ files: Source[] }>(FILES_API_ENDPOINT),
  refetchInterval: hasProcessingSources ? POLL_INTERVAL_MS : false,
});
```

Note: Move hasProcessingSources calculation before the query or use a separate effect.

**Step 4: Replace deleteSource with useMutation**

```typescript
const queryClient = useQueryClient();

const deleteMutation = useMutation({
  mutationFn: (key: string) =>
    apiRequest(FILES_API_ENDPOINT, {
      method: "DELETE",
      body: JSON.stringify({ key }),
    }),
  onMutate: async (key) => {
    await queryClient.cancelQueries({ queryKey: fileKeys.list() });
    const previous = queryClient.getQueryData<{ files: Source[] }>(fileKeys.list());

    queryClient.setQueryData<{ files: Source[] }>(fileKeys.list(), (old) => ({
      files: old?.files.filter((f) => f.key !== key) ?? [],
    }));

    return { previous };
  },
  onError: (err, key, context) => {
    queryClient.setQueryData(fileKeys.list(), context?.previous);
    const message = err instanceof Error ? err.message : "Delete failed";
    toast.error("Delete failed", { description: message });
  },
  onSuccess: () => {
    toast.success("Source deleted");
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: fileKeys.list() });
  },
});

const deleteSource = useCallback(
  (key: string) => {
    toast.loading("Deleting source...");
    deleteMutation.mutate(key);
  },
  [deleteMutation]
);
```

**Step 5: Update return statement**

Change `isLoading` to `isPending`.

**Step 6: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/sources/use-sources.ts
git commit -m "feat: migrate use-sources from SWR to TanStack Query

- Replace useSWR with useQuery
- Add optimistic delete with useMutation
- Use query key factory

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Migrate use-source-detail.ts

**Files:**
- Modify: `src/components/sources/use-source-detail.ts`

**Step 1: Replace imports**

Replace:
```typescript
import useSWR, { mutate } from "swr";
```

With:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fileKeys } from "@/lib/query-keys";
```

**Step 2: Replace useSWR with useQuery**

```typescript
const { data, isPending, error } = useQuery({
  queryKey: fileKeys.detail(id),
  queryFn: () => apiFetcher<SourceDetail>(`/api/files/${id}`),
  refetchInterval: (query) => {
    const data = query.state.data;
    if (
      data?.processingStatus === "pending" ||
      data?.processingStatus === "processing"
    ) {
      return 2000;
    }
    return false;
  },
  refetchOnWindowFocus: false,
});
```

**Step 3: Replace deleteSource with useMutation**

```typescript
const queryClient = useQueryClient();

const deleteMutation = useMutation({
  mutationFn: () =>
    apiRequest("/api/files", {
      method: "DELETE",
      body: JSON.stringify({ key: data?.key }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: fileKeys.list() });
    toast.success("Source deleted");
    router.push("/sources");
  },
  onError: (err) => {
    const message = err instanceof Error ? err.message : "Delete failed";
    toast.error("Delete failed", { description: message });
  },
});

const deleteSource = useCallback(() => {
  if (!data) return;
  toast.loading("Deleting source...");
  deleteMutation.mutate();
}, [data, deleteMutation]);
```

**Step 4: Update return**

```typescript
return {
  source: data ?? null,
  isLoading: isPending,
  error: error ?? null,
  isDeleting: deleteMutation.isPending,
  deleteSource,
};
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/sources/use-source-detail.ts
git commit -m "feat: migrate use-source-detail from SWR to TanStack Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Migrate upload-provider.tsx

**Files:**
- Modify: `src/components/sources/upload-provider.tsx`

**Step 1: Replace SWR import**

Replace:
```typescript
import { mutate } from "swr";
```

With:
```typescript
import { useQueryClient } from "@tanstack/react-query";
import { fileKeys } from "@/lib/query-keys";
```

**Step 2: Add queryClient hook**

Inside UploadProvider component, add:
```typescript
const queryClient = useQueryClient();
```

**Step 3: Replace mutate calls**

Replace:
```typescript
await mutate(FILES_API_ENDPOINT);
```

With:
```typescript
await queryClient.invalidateQueries({ queryKey: fileKeys.list() });
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/sources/upload-provider.tsx
git commit -m "feat: migrate upload-provider from SWR to TanStack Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Migrate data-state/provider.tsx (Dashboard)

**Files:**
- Modify: `src/components/dashboard/data-state/provider.tsx`

**Step 1: Replace imports**

Replace:
```typescript
import useSWR from "swr";
```

With:
```typescript
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { logKeys } from "@/lib/query-keys";
```

**Step 2: Replace useSWR with useQuery**

```typescript
const { data, isPending, isFetching, error } = useQuery({
  queryKey: logKeys.aggregation(selectedFile ?? "", queryString),
  queryFn: () => apiFetcher<Aggregations>(aggUrl!),
  enabled: shouldFetch && aggUrl !== null,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
});
```

**Step 3: Update status calculation**

Replace `isLoading` with `isPending`:
```typescript
if (isPending && !data) return "loading";
```

**Step 4: Update isFiltering**

Replace `isValidating` with `isFetching`:
```typescript
const isFiltering = isFetching && status === "success";
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/dashboard/data-state/provider.tsx
git commit -m "feat: migrate DashboardProvider from SWR to TanStack Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Migrate logs-table.tsx

**Files:**
- Modify: `src/components/dashboard/logs-table.tsx`

**Step 1: Replace imports**

Replace:
```typescript
import useSWR from "swr";
```

With:
```typescript
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { logKeys } from "@/lib/query-keys";
```

**Step 2: Replace useSWR with useQuery**

In LogsTableData component:
```typescript
const paramsObj = Object.fromEntries(params.entries());

const { data, isPending } = useQuery({
  queryKey: logKeys.list(paramsObj),
  queryFn: () => apiFetcher<LogsResponse>(`/api/logs?${params.toString()}`),
  enabled: !!state.selectedFile,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
});
```

**Step 3: Update loading check**

Replace:
```typescript
if (isLoading && !data) {
```

With:
```typescript
if (isPending && !data) {
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/dashboard/logs-table.tsx
git commit -m "feat: migrate logs-table from SWR to TanStack Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Migrate pipeline-content.tsx

**Files:**
- Modify: `src/components/processing/pipeline-content.tsx`

**Step 1: Replace imports**

Replace:
```typescript
import useSWR from "swr";
```

With:
```typescript
import { useQuery } from "@tanstack/react-query";
import { processingKeys } from "@/lib/query-keys";
```

**Step 2: Replace useSWR with useQuery**

```typescript
const { data, error, isPending } = useQuery({
  queryKey: processingKeys.stats(),
  queryFn: () => apiFetcher<ProcessingData>("/api/processing"),
  refetchInterval: 2000,
});
```

**Step 3: Update loading prop**

Replace all `isLoading` with `isPending`.

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/processing/pipeline-content.tsx
git commit -m "feat: migrate pipeline-content from SWR to TanStack Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Update api-client.ts for Generic Types

**Files:**
- Modify: `src/lib/api-client.ts`

**Step 1: Ensure apiFetcher supports generics properly**

Verify the apiFetcher function signature:
```typescript
export async function apiFetcher<T>(url: string): Promise<T> {
  // implementation
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit if changes made**

```bash
git add src/lib/api-client.ts
git commit -m "chore: improve api-client type inference

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Final Verification

**Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No new lint errors

**Step 3: Verify no SWR imports remain**

Run: `grep -r "from ['\"]swr['\"]" src/`
Expected: No results

**Step 4: Manual testing checklist**

- [ ] Sources page loads and lists files
- [ ] Upload a file works and list refreshes
- [ ] Delete a source works (optimistically removes from list)
- [ ] Source detail page loads
- [ ] Dashboard loads aggregations
- [ ] Logs table loads and paginates
- [ ] Pipeline page shows processing status
- [ ] Auto-refresh works on processing files
- [ ] DevTools shows in development mode

**Step 5: Commit final changes if any**

```bash
git add -A
git commit -m "chore: complete SWR to TanStack Query migration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `package.json` | Replace swr with @tanstack/react-query |
| `src/lib/query-client.ts` | New: QueryClient configuration |
| `src/lib/query-keys.ts` | New: Query key factories |
| `src/components/providers/query-provider.tsx` | New: QueryClientProvider wrapper |
| `src/app/layout.tsx` | Add QueryProvider |
| `src/components/sources/use-sources.ts` | Migrate to useQuery + useMutation |
| `src/components/sources/use-source-detail.ts` | Migrate to useQuery + useMutation |
| `src/components/sources/upload-provider.tsx` | Replace mutate with invalidateQueries |
| `src/components/dashboard/data-state/provider.tsx` | Migrate to useQuery |
| `src/components/dashboard/logs-table.tsx` | Migrate to useQuery |
| `src/components/processing/pipeline-content.tsx` | Migrate to useQuery |

## Key TanStack Query v5 Patterns Used

1. **Object syntax** - All queries use `{ queryKey, queryFn, ...options }`
2. **isPending** - Used instead of isLoading for initial load state
3. **keepPreviousData** - Imported as helper, used with `placeholderData`
4. **Query key factories** - Hierarchical keys for cache management
5. **Optimistic updates** - onMutate/onError/onSettled pattern for mutations
6. **refetchInterval** - Conditional polling based on data state
