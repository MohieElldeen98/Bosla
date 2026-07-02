import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";

/**
 * Enables Next.js Draft Mode and sends the admin to the public homepage,
 * which then renders the live draft instead of the published snapshot
 * (`src/app/[locale]/page.tsx`'s `draftMode().isEnabled` branch) — the same
 * rendering pipeline visitors use, just fed draft data (Step 6.5,
 * docs/cms-overview.md §15). A Route Handler, not a `page.tsx`, so it's
 * never wrapped by `(admin)/layout.tsx`'s `AdminShell`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const user = await requireCmsAccess();
  if (!user) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { locale } = await params;
  const draft = await draftMode();
  draft.enable();

  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}
