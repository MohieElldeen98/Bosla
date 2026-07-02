import type { Locale } from "@/i18n/routing";

/**
 * A piece of content stored once per supported locale. This is the shape every
 * CMS-editable string uses so an eventual Admin Panel edits one record instead
 * of maintaining parallel English/Arabic content types.
 */
export type LocalizedText = Record<Locale, string>;
