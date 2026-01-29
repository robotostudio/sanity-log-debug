"use client";

import {
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CheckCircle2Icon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-sky-400" />,
        warning: <AlertTriangleIcon className="size-4 text-amber-400" />,
        error: <XCircleIcon className="size-4 text-rose-400" />,
        loading: <Loader2Icon className="size-4 text-zinc-400 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-lg",
          title: "text-zinc-100 font-medium",
          description: "text-zinc-400",
          actionButton: "bg-zinc-100 text-zinc-900",
          cancelButton: "bg-zinc-800 text-zinc-100",
          success: "!border-emerald-500",
          error: "!border-rose-500",
          warning: "!border-amber-500",
          info: "!border-sky-500",
        },
      }}
      style={
        {
          "--normal-bg": "rgb(24 24 27)",
          "--normal-text": "rgb(244 244 245)",
          "--normal-border": "rgb(39 39 42)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
