import { Loader2 } from "lucide-react";

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
