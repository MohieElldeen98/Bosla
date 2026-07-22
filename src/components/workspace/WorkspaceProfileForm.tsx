"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { getResolvedMediaByIdAction } from "@/cms/actions/media.actions";
import { updateOwnProfileAction } from "@/auth/actions/update-own-profile.action";
import type { Locale } from "@/i18n/routing";
import type { Profile } from "@/auth/types/profile";

/** `profiles.avatar_url` stores a real URL, but `MediaPickerField`
 *  (`avatarUrl`'s field here) always writes back a Media Library asset
 *  *id* on selection — the same contract every other `MediaPickerField`
 *  in the app has, since everywhere else binds it to an `*ImageId` FK, not
 *  a raw URL. Validating this field as `.url()` made a freshly-picked
 *  asset id fail silently (no rendered error, so Save looked like it did
 *  nothing) since a UUID isn't a URL. Loosened to "non-empty string" —
 *  `onSubmit` resolves an id-shaped value to its real URL before saving. */
const profileFormSchema = z.object({
  avatarUrl: z.string().min(1).nullable(),
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
  const locale = useLocale() as Locale;
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

  /** A freshly-picked value is a Media Library asset id (never
   *  `http(s)://`-prefixed, unlike every real stored avatar URL) — resolve
   *  it to the asset's actual URL before saving. An unchanged, already-a-
   *  URL value passes through untouched. Prefers `thumbnailUrl` over the
   *  full-resolution `url` — this is a small circular avatar everywhere
   *  it's rendered (28-64px), never the full original, and `profiles
   *  .avatar_url` is a single frozen column with no separate thumbnail
   *  field, so getting the size right here is the only chance to. */
  async function resolveAvatarUrl(value: string | null): Promise<string | null> {
    if (!value || /^https?:\/\//.test(value)) return value;
    const asset = await getResolvedMediaByIdAction(value, locale);
    return asset?.thumbnailUrl ?? asset?.url ?? null;
  }

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateOwnProfileAction({
      avatarUrl: await resolveAvatarUrl(values.avatarUrl),
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

  /** Without this, a client-side validation failure (e.g. a malformed
   *  website URL) looked exactly like Save doing nothing — the same
   *  silent-failure class of bug the avatar field had. */
  function onInvalid() {
    toast.error(t("validationError"));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="max-w-2xl space-y-6">
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
