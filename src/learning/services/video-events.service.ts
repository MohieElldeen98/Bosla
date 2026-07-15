import { VideoEventsRepository } from "@/learning/repositories/video-events.repository";
import { safeMutation } from "@/learning/utils/safe-operation";
import type { AuthUser } from "@/auth/types/session";
import type { RecordVideoEventInput } from "@/learning/types/video-event";

/** Analytics is deliberately best-effort: a failed event must never interrupt a video session. */
export const VideoEventsService = {
  async record(actingUser: AuthUser | null, input: RecordVideoEventInput): Promise<void> {
    await safeMutation(async () => {
      await VideoEventsRepository.create(input, actingUser?.id ?? null);
      return { success: true, data: undefined };
    });
  },
};
