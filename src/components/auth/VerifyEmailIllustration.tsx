import { Mail, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small, tasteful illustration for the Verify Email page — layered soft
 * gradient blobs behind a white medallion, matching the homepage Hero's
 * palette rather than custom artwork. `variant` swaps the icon/accent
 * between the "check your inbox" and "verified" states of the same page.
 */
export function VerifyEmailIllustration({ variant }: { variant: "pending" | "verified" }) {
  const isVerified = variant === "verified";

  return (
    <div className="relative mx-auto flex size-28 items-center justify-center">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full blur-2xl",
          isVerified ? "bg-emerald-200/60" : "bg-sky-200/60",
        )}
      />
      <div className="relative flex size-24 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            isVerified ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-primary",
          )}
        >
          {isVerified ? (
            <MailCheck aria-hidden="true" className="size-7" />
          ) : (
            <Mail aria-hidden="true" className="size-7" />
          )}
        </div>
      </div>
    </div>
  );
}
