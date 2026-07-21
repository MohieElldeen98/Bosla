"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function remaining(end: string): { days: number; hours: number; minutes: number } {
  const seconds = Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
  };
}

/**
 * Display-only urgency: ticks against the course's real `saleEndsAt` and
 * unmounts itself at zero. It never touches the price — expiry hides the
 * timer; repricing is an editorial act in the course editor.
 */
export function DealCountdown({ saleEndsAt }: { saleEndsAt: string }) {
  const t = useTranslations("CourseCatalog.detail");
  const [time, setTime] = useState(() => remaining(saleEndsAt));

  useEffect(() => {
    const interval = window.setInterval(() => setTime(remaining(saleEndsAt)), 1000);
    return () => window.clearInterval(interval);
  }, [saleEndsAt]);

  if (time.days === 0 && time.hours === 0 && time.minutes === 0) return null;

  return (
    <p className="text-sm font-semibold tabular-nums text-achievement">
      {time.days > 0
        ? t("offerEndsDays", { days: time.days, hours: time.hours })
        : t("offerEndsHours", { hours: time.hours, minutes: time.minutes })}
    </p>
  );
}
