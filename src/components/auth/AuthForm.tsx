import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function AuthForm({ className, ...props }: ComponentProps<"form">) {
  return <form noValidate className={cn("space-y-5", className)} {...props} />;
}
