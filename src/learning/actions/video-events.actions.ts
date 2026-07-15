"use server";

import { SessionService } from "@/auth/services/session.service";
import { VideoEventsService } from "@/learning/services/video-events.service";
import { recordVideoEventSchema } from "@/learning/validators/video-event.validator";

/** Unauthenticated-tolerant by design; analytics never becomes a playback dependency. */
export async function recordVideoEventAction(rawInput: unknown): Promise<void> {
  const parsed = recordVideoEventSchema.safeParse(rawInput);
  if (!parsed.success) return;
  await VideoEventsService.record(await SessionService.getCurrentUser(), parsed.data);
}
