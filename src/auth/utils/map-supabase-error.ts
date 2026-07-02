import type { AuthError } from "@supabase/supabase-js";
import type { AuthErrorCode } from "@/auth/types/result";

/**
 * Supabase's `AuthError.code` (a stable string like `"invalid_credentials"`
 * or `"user_already_exists"`) is the primary signal — far more robust than
 * matching `error.message`, which is free text that can change between SDK
 * versions or already be localized server-side. Message matching is kept
 * only as a fallback for older SDK responses that predate `.code`.
 */
const CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: "invalid_credentials",
  user_already_exists: "email_already_registered",
  email_exists: "email_already_registered",
  identity_already_exists: "email_already_registered",
  weak_password: "weak_password",
  email_not_confirmed: "email_not_verified",
  over_request_rate_limit: "rate_limited",
  over_email_send_rate_limit: "rate_limited",
  over_sms_send_rate_limit: "rate_limited",
  otp_expired: "expired_token",
  flow_state_expired: "expired_token",
  session_expired: "expired_token",
  reauthentication_needed: "expired_token",
};

export function mapSupabaseAuthError(error: AuthError | null): AuthErrorCode {
  if (!error) return "unknown";

  if (error.code && CODE_MAP[error.code]) {
    return CODE_MAP[error.code];
  }

  if (error.status === 429) return "rate_limited";

  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already exists")) {
    return "email_already_registered";
  }
  if (message.includes("invalid login credentials")) return "invalid_credentials";
  if (message.includes("email not confirmed")) return "email_not_verified";
  if (message.includes("password should be at least") || message.includes("weak")) {
    return "weak_password";
  }
  if (message.includes("expired")) return "expired_token";

  return "unknown";
}
