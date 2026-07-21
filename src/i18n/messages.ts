import type { AbstractIntlMessages } from "next-intl";
import type { Locale } from "./routing";

// Each entry here is a folder of translations organized by feature, per
// locale (messages/<locale>/<namespace>.json). Adding a new feature area
// (e.g. a future "notifications" surface) means adding one filename here
// plus the matching JSON file per locale — no other wiring required.
const namespaces = [
  "common",
  "navigation",
  "footer",
  "home",
  "courses",
  "auth",
  "dashboard",
  "admin",
  "notifications",
  "blog",
  "legal",
  "me",
] as const;

export async function getMessagesForLocale(
  locale: Locale,
): Promise<AbstractIntlMessages> {
  const modules = await Promise.all(
    namespaces.map((namespace) =>
      import(`../../messages/${locale}/${namespace}.json`).then(
        (mod) => mod.default as AbstractIntlMessages,
      ),
    ),
  );

  return Object.assign({}, ...modules);
}
