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
import { setNewsletterSubscriberStatusAction } from "@/newsletter/actions/newsletter-subscription.actions";
import type { NewsletterSubscriber } from "@/newsletter/types/newsletter-subscriber";

/** Per-row menu for `/admin/newsletter` — mirrors
 *  `ContactMessageRowActions`'s exact shape (toast + `router.refresh()`).
 *
 *  Unsubscribe is a status flip, never a delete: an address that opted out
 *  has to stay on record, otherwise the next export or import silently
 *  mails it again. There is deliberately no delete action here for the
 *  same reason — if a genuine erasure request comes in, that's a
 *  deliberate database operation, not a menu item one click away. */
export function NewsletterSubscriberRowActions({ subscriber }: { subscriber: NewsletterSubscriber }) {
  const t = useTranslations("Admin.newsletter");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextStatus = subscriber.status === "subscribed" ? "unsubscribed" : "subscribed";

  function handleToggle() {
    startTransition(async () => {
      const result = await setNewsletterSubscriberStatusAction(subscriber.id, nextStatus);
      if (result.success) {
        toast.success(t(nextStatus === "unsubscribed" ? "toasts.unsubscribed" : "toasts.resubscribed"));
        router.refresh();
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
        <DropdownMenuItem
          variant={nextStatus === "unsubscribed" ? "destructive" : "default"}
          onClick={handleToggle}
        >
          {t(nextStatus === "unsubscribed" ? "actions.unsubscribe" : "actions.resubscribe")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
