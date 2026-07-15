export const VIDEO_EVENT_TYPES = ["play", "pause", "complete", "progress"] as const;
export type VideoEventType = (typeof VIDEO_EVENT_TYPES)[number];

export interface RecordVideoEventInput {
  lessonId?: string | null;
  articleSlug?: string | null;
  event: VideoEventType;
  positionSeconds: number;
}
