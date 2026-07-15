import { z } from "zod";
import { VIDEO_EVENT_TYPES } from "@/learning/types/video-event";

export const recordVideoEventSchema = z.object({
  lessonId: z.string().uuid().nullable().optional(),
  articleSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/i).nullable().optional(),
  event: z.enum(VIDEO_EVENT_TYPES),
  positionSeconds: z.number().int().min(0).max(86400),
}).refine((input) => input.lessonId || input.articleSlug, { message: "A video source is required." });
