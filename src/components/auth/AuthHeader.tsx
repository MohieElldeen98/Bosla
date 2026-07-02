export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-500 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
