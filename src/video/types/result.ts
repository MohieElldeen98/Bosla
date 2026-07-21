/**
 * The Video-domain counterpart of `cms/types/result.ts`'s
 * `CmsActionResult` — same shape, its own vocabulary. `not_configured`
 * is the one code unique to this domain: the object store's credentials
 * are optional env (see `videoStorageEnv`), so every action can honestly
 * report "this feature is switched off in this deployment" and the UI
 * renders a placeholder instead of an error.
 */
export type VideoErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "not_configured"
  | "unknown";

export type VideoActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: VideoErrorCode; message: string };
