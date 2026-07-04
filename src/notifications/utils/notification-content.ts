import { getMessagesForLocale } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/i18n";

/** A template param is either a plain, locale-invariant value (an id, a
 *  name, a formatted number) or a `LocalizedText` value (e.g. a course's
 *  bilingual title) that must be resolved per locale before interpolating. */
export type NotificationContentParams = Record<string, string | LocalizedText>;

interface NotificationContentEntry {
  title: string;
  body: string;
}
type NotificationContentCatalog = Record<string, NotificationContentEntry>;

function isLocalizedText(value: string | LocalizedText): value is LocalizedText {
  return typeof value === "object" && value !== null;
}

function resolveParamsForLocale(params: NotificationContentParams, locale: Locale): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      isLocalizedText(value) ? resolveLocalizedText(value, locale) : value,
    ]),
  );
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? params[key] : match));
}

/**
 * Builds a `{ en, ar }` title/body pair for a `NotificationService.create`
 * call by reading `messages/{locale}/notifications.json`'s
 * `Notifications.content.<key>` entries — the same message catalog every
 * UI string in this app already comes from (`getMessagesForLocale` is
 * `src/i18n/request.ts`'s own loader), so a notification's copy lives in
 * one translator-editable place instead of being hand-written inline at
 * each Service call site.
 *
 * `params` may mix plain strings (ids, names, scores) with `LocalizedText`
 * values (a course's bilingual title, an instructor's bilingual name) —
 * the latter are resolved to the matching locale before interpolation, so
 * "your course X was approved" reads naturally in both languages even
 * though `X` itself came from one bilingual field.
 */
export async function buildNotificationContent(
  contentKey: string,
  params: NotificationContentParams = {},
): Promise<{ title: LocalizedText; body: LocalizedText }> {
  const title = {} as LocalizedText;
  const body = {} as LocalizedText;

  await Promise.all(
    routing.locales.map(async (locale) => {
      const messages = (await getMessagesForLocale(locale)) as unknown as {
        Notifications?: { content?: NotificationContentCatalog };
      };
      const entry = messages.Notifications?.content?.[contentKey];
      const localizedParams = resolveParamsForLocale(params, locale);
      title[locale] = entry ? interpolate(entry.title, localizedParams) : contentKey;
      body[locale] = entry ? interpolate(entry.body, localizedParams) : "";
    }),
  );

  return { title, body };
}
