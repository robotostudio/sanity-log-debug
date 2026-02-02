import type { ReactNode } from "react";

type DataStatus = "empty" | "loading" | "error" | "success";

interface AsyncStateProps<T> {
  status: DataStatus;
  data: T | null;
  error?: string | null;
  empty: ReactNode;
  loading: ReactNode;
  errorFallback?: (error: string) => ReactNode;
  children: (data: T) => ReactNode;
}

export function AsyncState<T>({
  status,
  data,
  error,
  empty,
  loading,
  errorFallback,
  children,
}: AsyncStateProps<T>): ReactNode {
  if (status === "empty") return empty;
  if (status === "loading") return loading;
  if (status === "error") {
    return errorFallback ? errorFallback(error ?? "Unknown error") : empty;
  }
  if (!data) return empty;
  return children(data);
}
