"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { SelectField } from "@/components/admin/courses/SelectField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { DateField } from "@/components/admin/coupons/DateField";
import { CourseCombobox } from "@/components/admin/users/CourseCombobox";
import { createOwnCouponAction, updateOwnCouponAction } from "@/commerce/actions/coupon.actions";
import { ownCouponFormSchema, type OwnCouponFormValues } from "@/commerce/validators/coupon.validator";
import { COUPON_DISCOUNT_TYPES } from "@/commerce/types/coupon";
import type { Coupon } from "@/commerce/types/coupon";

interface CourseOption {
  value: string;
  label: string;
}

/**
 * The Instructor Coupon Editor (`/instructor/coupons`, Phase 6, Step
 * 6.6) — the same one-reusable-form-for-Create-and-Edit shape as the
 * Admin `CouponEditorForm`, simplified: no `scope` selector (always
 * `"course"`, forced server-side in `CouponService.createOwn`) and the
 * course target picker only ever lists the signed-in Instructor's own
 * courses (`courses` prop, pre-filtered by the page), reusing
 * `CourseCombobox` as-is. `scopeId` (which course) is disabled once
 * editing — matches `updateOwnCouponSchema` not accepting it at all.
 */
export function InstructorCouponEditorForm({
  mode,
  coupon,
  courses,
}: {
  mode: "create" | "edit";
  coupon: Coupon | null;
  courses: CourseOption[];
}) {
  const t = useTranslations("Instructor.coupons");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OwnCouponFormValues>({
    resolver: zodResolver(ownCouponFormSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          scopeId: coupon.scopeId ?? "",
          maxRedemptions: coupon.maxRedemptions,
          expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : null,
          isActive: coupon.isActive,
        }
      : {
          code: "",
          discountType: "percentage",
          discountValue: 10,
          scopeId: "",
          maxRedemptions: null,
          expiresAt: null,
          isActive: true,
        },
  });

  async function onSubmit(values: OwnCouponFormValues) {
    setError(null);
    const result =
      mode === "create"
        ? await createOwnCouponAction(values)
        : await updateOwnCouponAction(coupon!.id, values, coupon!.updatedAt);

    if (!result.success) {
      setError(result.message);
      toast.error(result.code === "conflict" ? result.message : t("saveError"));
      return;
    }
    toast.success(mode === "create" ? t("createSuccess") : t("updateSuccess"));
    router.push("/instructor/coupons");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <PlainTextField id="coupon-code" label={t("fields.code")} name="code" register={register} errors={errors} hint={t("fields.codeHint")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          id="coupon-discount-type"
          label={t("fields.discountType")}
          name="discountType"
          control={control}
          options={COUPON_DISCOUNT_TYPES.map((type) => ({ value: type, label: t(`discountType.${type}`) }))}
        />
        <NumberField
          id="coupon-discount-value"
          label={t("fields.discountValue")}
          name="discountValue"
          register={register}
          errors={errors}
          step="0.01"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="coupon-scope-id">{t("fields.courseTarget")}</Label>
        <Controller
          name="scopeId"
          control={control}
          render={({ field }) => (
            <CourseCombobox
              options={courses}
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? "")}
              placeholder={t("fields.courseTargetPlaceholder")}
              disabled={mode === "edit"}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          id="coupon-max-redemptions"
          label={t("fields.maxRedemptions")}
          name="maxRedemptions"
          register={register}
          errors={errors}
          step="1"
          emptyValue={null}
          hint={t("fields.maxRedemptionsHint")}
        />
        <DateField id="coupon-expires-at" label={t("fields.expiresAt")} name="expiresAt" register={register} errors={errors} />
      </div>

      <CheckboxField id="coupon-is-active" label={t("fields.isActive")} name="isActive" control={control} />

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/instructor/coupons")}>
          {t("cancel")}
        </Button>
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("saving") : mode === "create" ? t("createCoupon") : t("saveChanges")}
        </LoadingButton>
      </div>
    </form>
  );
}
