import { getDb } from "@/db";
import { videoEvents } from "@/db/schema/learning";
import type { RecordVideoEventInput } from "@/learning/types/video-event";

export const VideoEventsRepository = {
  async create(input: RecordVideoEventInput, userId: string | null): Promise<void> {
    await getDb().insert(videoEvents).values({
      lessonId: input.lessonId ?? null,
      articleSlug: input.articleSlug ?? null,
      event: input.event,
      positionSeconds: input.positionSeconds,
      userId,
    });
  },
};
