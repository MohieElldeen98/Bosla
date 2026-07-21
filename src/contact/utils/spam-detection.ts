/** Lightweight, explainable checks for the public contact form. These are
 * intentionally soft signals: the caller returns a generic validation error
 * without exposing which check rejected the submission. */
const MIN_HUMAN_SUBMISSION_TIME_MS = 2_000;
const MAX_MESSAGE_URLS = 3;

export function isSpamLikeContactSubmission(input: {
  message: string;
  formLoadedAt: number;
}, now = Date.now()): boolean {
  const urlCount = input.message.match(/https?:\/\/[^\s<>'"]+/gi)?.length ?? 0;
  const submittedTooQuickly = now - input.formLoadedAt < MIN_HUMAN_SUBMISSION_TIME_MS;
  return urlCount > MAX_MESSAGE_URLS || submittedTooQuickly;
}
