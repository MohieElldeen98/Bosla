import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] ring-1 ring-black/5 sm:p-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
