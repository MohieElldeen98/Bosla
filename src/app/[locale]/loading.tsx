import { BoslaPageLoader } from "@/components/brand/BoslaPageLoader";

/**
 * The global route-transition state — segments under `[locale]` without
 * their own `loading.tsx` fall back here. The click-side counterpart is
 * `NavigationLoader` (mounted in the locale layout); both render the same
 * `BoslaPageLoader` scene.
 */
export default function Loading() {
  return <BoslaPageLoader />;
}
