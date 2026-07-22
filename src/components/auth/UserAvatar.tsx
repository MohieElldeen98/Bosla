import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/auth/utils/display-name";
import { cn } from "@/lib/utils";

/**
 * The one avatar-with-initials-fallback every signed-in-user surface in
 * the app renders through — admin/instructor header menus, the public
 * navbar, the Learner Workspace header, the admin Users list/detail, and
 * blog article bylines. All of them read the exact same source
 * (`Profile.avatarUrl` → `profiles.avatar_url`), so fixing how that URL
 * is produced (or a user re-uploading their photo) shows up identically
 * everywhere with no per-call-site markup to keep in sync — before this,
 * five call sites each had their own `<img>`-or-initials logic, and two
 * more (`UserMenu`/`InstructorUserMenu`) never read `avatarUrl` at all
 * and showed a generic icon no matter what.
 *
 * base-ui's `Avatar` swaps to `AvatarFallback` on its own whenever
 * `avatarUrl` is `null` or the image fails to load — no manual
 * `onError` state needed at any call site.
 */
export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
  /** Overrides the fallback initials' background/text color — a couple
   *  of call sites (navbar, workspace header) use `bg-primary` instead
   *  of the default `bg-accent` and this preserves that without forking
   *  the component. */
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn(className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className={cn(fallbackClassName)}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
