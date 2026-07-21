"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { updateOwnProfileAction } from "@/auth/actions/update-own-profile.action";
import type { Profile } from "@/auth/types/profile";

const profileFormSchema = z.object({
  avatarUrl: z.string().url().nullable(),
  fullName: z.string().trim().min(1).max(120).nullable(),
  displayName: z.string().trim().min(1).max(60).nullable(),
  profession: z.string().trim().max(120).nullable(),
  country: z.string().trim().max(120).nullable(),
  bio: z.string().trim().max(2000).nullable(),
  website: z.string().url().or(z.literal("")).nullable(),
  linkedin: z.string().url().or(z.literal("")).nullable(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

function toNullable(value: string | null): string | null {
  return value?.trim() ? value.trim() : null;
}

/** `/me/profile` — the personal-information-only editor
 *  (`ProfileService.updateProfile` already exists; this is its first
 *  form). Account-level concerns (email/password/language/notifications/
 *  delete) live in `WorkspaceSettingsForm` instead — this form never
 *  touches those fields, per the workspace's "profile vs settings"
 *  separation. */
export function WorkspaceProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("Me.profile");
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      avatarUrl: profile.avatarUrl,
      fullName: profile.fullName,
      displayName: profile.displayName,
      profession: profile.profession,
      country: profile.country,
      bio: profile.bio,
      website: profile.website,
      linkedin: profile.linkedin,
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateOwnProfileAction({
      avatarUrl: values.avatarUrl,
      fullName: toNullable(values.fullName),
      displayName: toNullable(values.displayName),
      profession: toNullable(values.profession),
      country: toNullable(values.country),
      bio: toNullable(values.bio),
      website: toNullable(values.website),
      linkedin: toNullable(values.linkedin),
    });
    if (result.success) {
      toast.success(t("saved"));
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-6">
      <MediaPickerField<ProfileFormValues>
        label={t("avatar")}
        name="avatarUrl"
        control={control}
        accept={["image"]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">{t("displayName")}</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profession">{t("profession")}</Label>
          <Input id="profession" {...register("profession")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">{t("country")}</Label>
          <Input id="country" {...register("country")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea id="bio" rows={4} {...register("bio")} />
        {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t("socialLinks")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="website">{t("website")}</Label>
            <Input id="website" placeholder="https://" {...register("website")} />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">{t("linkedin")}</Label>
            <Input id="linkedin" placeholder="https://linkedin.com/in/…" {...register("linkedin")} />
            {errors.linkedin && <p className="text-xs text-destructive">{errors.linkedin.message}</p>}
          </div>
        </div>
      </div>

      <LoadingButton type="submit" isLoading={isSubmitting} disabled={!isDirty}>
        {t("save")}
      </LoadingButton>
    </form>
  );
}
