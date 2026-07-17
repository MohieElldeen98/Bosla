import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Shared avatar-with-initials-fallback for the admin Users listing and
 *  Details page (Phase 7) — base-ui's `Avatar` automatically falls back
 *  when `avatarUrl` is `null`/fails to load, so no manual `onError`
 *  state juggling like the dashboard cards' cover-image-or-icon
 *  pattern needs. */
export function UserAvatar({
  name,
  email,
  avatarUrl,
  className,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn(className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  );
}
