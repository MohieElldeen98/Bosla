import { z } from "zod";

/**
 * Represents a persisted reference to a media asset rather than a strict
 * URL — for a plain `*Url` column that lives outside the Media Library's
 * `*ImageId` FKs (e.g. `profiles.avatar_url`). Accepts either a
 * same-origin relative path (`/api/media/{id}/thumbnail`, the app's own
 * delivery route, chosen so nothing bakes in a dev-only
 * `NEXT_PUBLIC_SITE_URL` origin at save time) or a full absolute URL
 * (external values, legacy rows). Rejects protocol-relative values
 * (`//host/...`), which a browser still resolves to an external host.
 *
 * The single source of truth for this shape — every `*Url` field that
 * stores a media reference this way should validate against it, so a
 * future change to how those references are minted or stored is one edit
 * here instead of a hunt through every domain's validators.
 */
export const mediaReferenceSchema = z.string().refine(
  (value) => {
    const isRelativeMediaPath = value.startsWith("/") && !value.startsWith("//");
    const isAbsoluteUrl = z.string().url().safeParse(value).success;
    return isRelativeMediaPath || isAbsoluteUrl;
  },
  { message: "Must be an absolute URL or a relative path." },
);
