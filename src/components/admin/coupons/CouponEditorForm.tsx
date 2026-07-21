"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { createCouponAction, updateCouponAction } from "@/commerce/actions/coupon.actions";
import { couponFormSchema, type CouponFormValues } from "@/commerce/validators/coupon.validator";
import { COUPON_DISCOUNT_TYPES, COUPON_SCOPES } from "@/commerce/types/coupon";
import type { Coupon } from "@/commerce/types/coupon";

interface ScopeOption {
  value: string;
  label: string;
}

/**
 * The Coupon Editor (Phase 5, Step 5.1) — one reusable form for Create
 * and Edit, mirroring `CreateEnrollmentForm`'s simplicity (a small,
 * mostly one-shot form) rather than `CourseEditorForm`'s heavier
 * `SectionFormShell`/dirty-tracking infra, which exists for long,
 * multi-section documents this isn't. The scope-target selector swaps
 * between the Course and Specialty option lists as `scope` changes,
 * reusing `CourseCombobox` as-is for both (it's already generic over any
 * `{value,label}` list, not actually course-specific) — no new selector
 * built, matching this step's "reuse existing searchable selector"
 * scope.
 */
export function CouponEditorForm({
  mode,
  coupon,
  courses,
  specialties,
}: {
  mode: "create" | "edit";
  coupon: Coupon | null;
  courses: ScopeOption[];
  specialties: ScopeOption[];
}) {
  const t = useTranslations("Admin.coupons");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          scope: coupon.scope,
          scopeId: coupon.scopeId,
          maxRedemptions: coupon.maxRedemptions,
          maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
          minSubtotal: coupon.minSubtotal !== null ? Number(coupon.minSubtotal) : null,
          maxDiscountAmount: coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : null,
          expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : null,
          isActive: coupon.isActive,
        }
      : {
          code: "",
          discountType: "percentage",
          discountValue: 10,
          scope: "sitewide",
          scopeId: null,
          maxRedemptions: null,
          maxRedemptionsPerUser: null,
          minSubtotal: null,
          maxDiscountAmount: null,
          expiresAt: null,
          isActive: true,
        },
  });

  const scope = useWatch({ control, name: "scope" });
  const scopeOptions = scope === "specialty" ? specialties : courses;

  async function onSubmit(values: CouponFormValues) {
    setError(null);
    const result =
      mode === "create"
        ? await createCouponAction(values)
        : await updateCouponAction(coupon!.id, values, coupon!.updatedAt);

    if (!result.success) {
      setError(result.message);
      toast.error(result.code === "conflict" ? result.message : t("saveError"));
      return;
    }
    toast.success(mode === "create" ? t("createSuccess") : t("updateSuccess"));
    router.push("/admin/coupons");
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

      <SelectField
        id="coupon-scope"
        label={t("fields.scope")}
        name="scope"
        control={control}
        options={COUPON_SCOPES.map((s) => ({ value: s, label: t(`scope.${s}`) }))}
      />

      {scope !== "sitewide" && (
        <div className="space-y-1.5">
          <Label htmlFor="coupon-scope-id">{scope === "specialty" ? t("fields.specialtyTarget") : t("fields.courseTarget")}</Label>
          <Controller
            name="scopeId"
            control={control}
            render={({ field }) => (
              <CourseCombobox
                options={scopeOptions}
                value={field.value ?? null}
                onValueChange={field.onChange}
                placeholder={t("fields.scopeTargetPlaceholder")}
              />
            )}
          />
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField
          id="coupon-max-redemptions-per-user"
          label={t("fields.maxRedemptionsPerUser")}
          name="maxRedemptionsPerUser"
          register={register}
          errors={errors}
          step="1"
          emptyValue={null}
          hint={t("fields.maxRedemptionsPerUserHint")}
        />
        <NumberField
          id="coupon-min-subtotal"
          label={t("fields.minSubtotal")}
          name="minSubtotal"
          register={register}
          errors={errors}
          step="0.01"
          emptyValue={null}
          hint={t("fields.minSubtotalHint")}
        />
        <NumberField
          id="coupon-max-discount-amount"
          label={t("fields.maxDiscountAmount")}
          name="maxDiscountAmount"
          register={register}
          errors={errors}
          step="0.01"
          emptyValue={null}
          hint={t("fields.maxDiscountAmountHint")}
        />
      </div>

      <CheckboxField id="coupon-is-active" label={t("fields.isActive")} name="isActive" control={control} />

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/coupons")}>
          {t("cancel")}
        </Button>
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("saving") : mode === "create" ? t("createCoupon") : t("saveChanges")}
        </LoadingButton>
      </div>
    </form>
  );
}
