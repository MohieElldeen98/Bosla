import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { ComingSoonPage } from "@/components/auth/ComingSoonPage";

/** `/settings` — reachable by any authenticated role via `(student)/layout.tsx`'s
 *  guard. Placeholder only — account settings functionality (password
 *  change, notification preferences, etc.) is a separate, future step. */
export default async function SettingsPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const profile = await ProfileService.getByUserId(user.id);
  return <ComingSoonPage pageKey="settings" user={user} profile={profile} />;
}
