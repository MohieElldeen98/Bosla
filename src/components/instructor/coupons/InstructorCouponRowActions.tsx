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
import { setOwnCouponActiveAction } from "@/commerce/actions/coupon.actions";
import type { CouponListItem } from "@/commerce/types/coupon-search";

/** Per-row menu for the Instructor Coupons listing — mirrors the Admin
 *  `CouponRowActions` exactly, pointed at the Own Server Action and the
 *  `/instructor/coupons` route instead. */
export function InstructorCouponRowActions({ coupon }: { coupon: CouponListItem }) {
  const t = useTranslations("Instructor.coupons");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSetActive(isActive: boolean) {
    startTransition(async () => {
      const result = await setOwnCouponActiveAction(coupon.id, isActive, coupon.updatedAt);
      if (result.success) {
        toast.success(isActive ? t("toasts.activated") : t("toasts.deactivated"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label={t("actionsFor", { code: coupon.code })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/instructor/coupons/${coupon.id}/edit`)}>
          {t("actions.edit")}
        </DropdownMenuItem>
        {coupon.isActive ? (
          <DropdownMenuItem variant="destructive" onClick={() => handleSetActive(false)}>
            {t("actions.deactivate")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleSetActive(true)}>{t("actions.activate")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
