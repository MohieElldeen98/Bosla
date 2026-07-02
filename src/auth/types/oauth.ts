/**
 * The subset of Supabase's own `Provider` union Bosla plans to support.
 * Names match Supabase's provider ids exactly (`azure` is Microsoft) so no
 * translation layer is needed between this type and the SDK call. Adding a
 * provider later (see docs/authentication-architecture.md "Future ready")
 * is: add its id here, add one `signInWith<Provider>` convenience wrapper
 * in `auth.repository.ts` that calls the existing generic
 * `signInWithOAuth`, and one button in the UI — no other change required.
 */
export const OAUTH_PROVIDERS = ["google", "apple", "azure", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
