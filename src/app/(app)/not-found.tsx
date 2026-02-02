import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-medium text-zinc-100">Page not found</h2>
      <p className="text-sm text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
      >
        Go home
      </Link>
    </div>
  );
}
