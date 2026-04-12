"use client";

import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

const toastShell = cn(
  "group flex w-full items-start gap-3 rounded-xl border-2 border-border bg-card p-4 text-sm text-card-foreground antialiased",
  "shadow-[3px_3px_0_0_var(--border)]",
);

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="light"
      className="font-sans"
      offset={{ top: "5.5rem" }}
      mobileOffset={{ top: "4.5rem" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: toastShell,
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "font-semibold text-foreground",
          description: "text-[13px] leading-snug text-muted-foreground",
          icon: "mt-0.5 shrink-0 text-foreground [&_svg]:size-4",
          actionButton: cn(
            "ml-auto mt-1 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border-2 border-border",
            "bg-primary px-3 text-xs font-semibold text-primary-foreground",
            "shadow-[2px_2px_0_0_var(--border)] hover:bg-primary/90",
            "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
          ),
          cancelButton: cn(
            "mt-1 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted",
            "px-3 text-xs font-semibold text-foreground",
            "shadow-[2px_2px_0_0_var(--border)] hover:bg-muted/80",
            "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
          ),
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          warning: "[&_[data-icon]]:text-secondary",
          info: "[&_[data-icon]]:text-phase-short",
          loading: "[&_.sonner-loading-bar]:!bg-primary",
        },
      }}
    />
  );
}
