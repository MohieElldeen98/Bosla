export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
