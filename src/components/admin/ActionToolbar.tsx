import type { ReactNode } from "react";

export function ActionToolbar({
  search,
  actions,
}: {
  search?: ReactNode;
  actions?: ReactNode;
}) {
  if (!search && !actions) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {search && <div className="w-full sm:max-w-xs">{search}</div>}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
