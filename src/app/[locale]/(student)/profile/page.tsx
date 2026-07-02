import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { ComingSoonPage } from "@/components/auth/ComingSoonPage";

/** `/profile` — reachable by any authenticated role via `(student)/layout.tsx`'s
 *  guard. Placeholder only — profile editing UI is a separate, future step
 *  (`ProfileService.updateProfile` already exists but has no form yet). */
export default async function ProfilePage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const profile = await ProfileService.getByUserId(user.id);
  return <ComingSoonPage pageKey="profile" user={user} profile={profile} />;
}
