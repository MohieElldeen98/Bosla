import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { ComingSoonPage } from "@/components/auth/ComingSoonPage";

/** `/dashboard` — reachable by any authenticated role via `(student)/layout.tsx`'s
 *  guard (`requireRole`, already run before this renders). Placeholder only —
 *  the real Student Dashboard is a separate, future roadmap step. */
export default async function DashboardPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const profile = await ProfileService.getByUserId(user.id);
  return <ComingSoonPage pageKey="myDashboard" user={user} profile={profile} />;
}
