"use client";

import { useRouter } from "@/i18n/navigation";
import { ContactMessageRowActions } from "@/components/admin/contact/ContactMessageRowActions";
import type { ContactMessage } from "@/contact/types/contact-message";

/** `/admin/contact/[id]`'s action menu — same `ContactMessageRowActions`
 *  the inbox list uses, but a successful delete here has nowhere to
 *  "refresh" into (the row is gone), so it navigates back to the
 *  inbox instead. */
export function ContactMessageDetailActions({ message }: { message: ContactMessage }) {
  const router = useRouter();
  return <ContactMessageRowActions message={message} onDeleted={() => router.push("/admin/contact")} />;
}
