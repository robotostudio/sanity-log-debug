"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-medium text-zinc-100">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[8px] bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
      >
        Try again
      </button>
    </div>
  );
}
