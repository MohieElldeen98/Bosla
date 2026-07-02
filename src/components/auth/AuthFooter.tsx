import { Link } from "@/i18n/navigation";

export function AuthFooter({
  prompt,
  actionLabel,
  href,
}: {
  prompt?: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-slate-500">
      {prompt ? `${prompt} ` : null}
      <Link href={href} className="font-medium text-primary hover:underline">
        {actionLabel}
      </Link>
    </p>
  );
}
