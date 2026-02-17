"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  const pathname = usePathname();

  // Derive page name from pathname for breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const pageName =
    segments.length > 0
      ? segments[segments.length - 1].charAt(0).toUpperCase() +
        segments[segments.length - 1].slice(1)
      : "Home";

  return (
    <div className="shrink-0">
      <p className="text-base leading-6">
        <span className="text-[#d4d4d8]">Sanity Logs</span>
        <span className="text-[#fafafa]">{`  /  ${pageName}`}</span>
      </p>
      <div className="mt-8 flex items-center justify-between">
        <h1 className="font-pixel text-2xl font-medium leading-9 text-[#fafafa]">
          {title}
        </h1>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
