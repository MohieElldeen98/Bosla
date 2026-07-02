"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  placeholder,
  disabled,
  className,
  ...props
}: React.ComponentProps<"input"> & { placeholder: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        placeholder={placeholder}
        disabled={disabled}
        className="ps-8"
        {...props}
      />
    </div>
  );
}
