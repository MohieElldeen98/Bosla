import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  isLoading?: boolean;
}

export function LoadingButton({
  isLoading = false,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} aria-busy={isLoading} {...props}>
      {isLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
