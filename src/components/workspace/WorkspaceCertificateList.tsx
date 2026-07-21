import { getTranslations } from "next-intl/server";
import { Award, Download, Eye, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Certificate } from "@/certificates/types/certificate";

type CertificateWithCourseTitle = Certificate & { courseTitle: string };

/** List rendering only — View/Download are plain links to the PDF route
 *  (`?download=1` flips the disposition, see that route's doc comment),
 *  no client JS needed. Share is present but disabled: there's no public
 *  certificate-verification page yet, so a real share link would be
 *  dishonest to ship — "future-ready," per the spec's own wording, not
 *  functional today. */
export async function WorkspaceCertificateList({
  certificates,
  locale,
}: {
  certificates: CertificateWithCourseTitle[];
  locale: string;
}) {
  const t = await getTranslations("Me.certificates");

  return (
    <ul className="space-y-3">
      {certificates.map((certificate) => (
        <li key={certificate.id}>
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{certificate.courseTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {certificate.certificateNumber} ·{" "}
                  {t("issued", { date: new Date(certificate.issuedAt).toLocaleDateString(locale) })}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/api/certificates/${certificate.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Eye aria-hidden="true" />
                {t("view")}
              </a>
              <a
                href={`/api/certificates/${certificate.id}/pdf?download=1`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Download aria-hidden="true" />
                {t("download")}
              </a>
              <button
                type="button"
                disabled
                title={t("shareComingSoon")}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "cursor-not-allowed opacity-50")}
              >
                <Share2 aria-hidden="true" />
                {t("share")}
              </button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
