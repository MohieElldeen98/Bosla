"use client";

import { BoslaPlayer } from "@/components/player/BoslaPlayer";
import { setLessonProgressAction, updateLessonPositionAction } from "@/learning/actions/lesson-progress.actions";

export function LessonVideoPlayer({
  src, lessonId, studentId, studentEmail, initialPosition, title,
}: {
  src: string;
  lessonId: string;
  studentId: string;
  studentEmail: string | null;
  initialPosition: number;
  title: string;
}) {
  return (
    <BoslaPlayer
      src={src} title={title} initialPosition={initialPosition} watermarkText={studentEmail ?? undefined} lessonId={lessonId}
      onProgress={(seconds) => { void updateLessonPositionAction({ studentId, lessonId, positionSeconds: Math.floor(seconds) }); }}
      onComplete={() => { void setLessonProgressAction({ studentId, lessonId, completed: true }); }}
    />
  );
}
