"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleSectionAction } from "@/cms/actions/section.actions";

/** Enable/disable for one homepage section — optimistic: flips immediately,
 *  reverts (and toasts) if `toggleSectionAction` (existing Server Action,
 *  Step 6.1) fails. A sibling of `AccordionTrigger`, never nested inside
 *  it — a `<button>` (the trigger) can't contain another interactive
 *  control without breaking keyboard/screen-reader semantics. */
export function SectionEnableToggle({
  sectionId,
  isEnabled,
  onToggled,
}: {
  sectionId: string;
  isEnabled: boolean;
  onToggled: (next: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    onToggled(next);
    startTransition(async () => {
      const result = await toggleSectionAction(sectionId, next);
      if (!result.success) {
        onToggled(!next);
        toast.error(result.message);
      }
    });
  }

  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={handleChange}
      disabled={isPending}
      aria-label={isEnabled ? t("disableSection") : t("enableSection")}
    />
  );
}
