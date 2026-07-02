import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Disables Draft Mode and returns to the editor. No auth check needed —
 *  disabling a draft-mode cookie reveals nothing and only Draft Mode itself
 *  gates content, not this endpoint. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const draft = await draftMode();
  draft.disable();

  return NextResponse.redirect(new URL(`/${locale}/admin/homepage`, request.url));
}
