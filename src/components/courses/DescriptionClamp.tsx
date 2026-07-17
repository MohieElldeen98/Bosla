"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function DescriptionClamp({ description }: { description: string }) {
  const t = useTranslations("CourseCatalog.detail");
  const [expanded, setExpanded] = useState(false);
  const words = description.trim().split(/\s+/);
  const isLong = words.length > 400;
  const text = !expanded && isLong ? `${words.slice(0, 400).join(" ")}…` : description;
  return (
    <div>
      <p className="whitespace-pre-line text-muted-foreground">{text}</p>
      {isLong && <button type="button" className="mt-3 font-medium text-primary hover:underline" onClick={() => setExpanded((value) => !value)}>{expanded ? t("showLess") : t("showMore")}</button>}
    </div>
  );
}
