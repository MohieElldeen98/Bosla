"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteContactMessageAction, markContactMessageResolvedAction } from "@/contact/actions/contact-message.actions";
import type { ContactMessage } from "@/contact/types/contact-message";

/** Per-row menu for `/admin/contact` and its detail page — mirrors
 *  `OrderRowActions`'s exact shape (toast + `router.refresh()`).
 *  `onDeleted` lets the detail page navigate back to the inbox after a
 *  successful delete, since there's no row left to refresh in place. */
export function ContactMessageRowActions({
  message,
  onDeleted,
}: {
  message: ContactMessage;
  onDeleted?: () => void;
}) {
  const t = useTranslations("Admin.contact");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkResolved() {
    startTransition(async () => {
      const result = await markContactMessageResolvedAction(message.id);
      if (result.success) {
        toast.success(t("toasts.resolved"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deleteContactMessageAction(message.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        if (onDeleted) onDeleted();
        else router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" disabled={isPending}>
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">{t("actions.open")}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {message.status !== "resolved" && (
          <DropdownMenuItem onClick={handleMarkResolved}>{t("actions.markResolved")}</DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          {t("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
