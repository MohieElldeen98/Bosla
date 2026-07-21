"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { deleteOwnAccountAction } from "@/auth/actions/delete-own-account.action";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { SessionClientService } from "@/auth/services/session-client.service";

/** `/me/settings`'s destructive action — `window.confirm`, the same
 *  confirmation pattern every other destructive action in this codebase
 *  already uses (`CourseRowActions`, `ContactMessageRowActions`, …), not
 *  a bespoke dialog. On success, signs out the same two-step way
 *  `NavbarUserMenu`'s sign-out already does (server action + the
 *  client-side `SessionClientService.signOut()`, so `useSession()`'s
 *  listener actually fires) before redirecting home. */
export function WorkspaceDeleteAccountSection() {
  const t = useTranslations("Me.settings.deleteAccount");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t("confirm"))) return;
    startTransition(async () => {
      const result = await deleteOwnAccountAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      await Promise.all([signOutAction(), SessionClientService.signOut()]);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Card className="space-y-3 border-destructive/30 p-5">
      <div>
        <h3 className="text-sm font-medium text-destructive">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <LoadingButton type="button" variant="destructive" isLoading={isPending} onClick={handleDelete}>
        {t("deleteButton")}
      </LoadingButton>
    </Card>
  );
}
