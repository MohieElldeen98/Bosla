"use client";

import { usePathname } from "next/navigation";
import { Link as LinkIcon, Mail } from "lucide-react";
import { toast } from "sonner";
import { siteUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

// Brand glyphs inlined — this lucide version ships no brand icons; same
// precedent as `layout/footer.tsx`'s own `XIcon`/`LinkedinIcon`.
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  );
}

function useShareUrl(): string {
  const pathname = usePathname();
  // Built from the configured canonical origin (NEXT_PUBLIC_SITE_URL),
  // not window.location: Facebook/LinkedIn reject unreachable hosts
  // (localhost, LAN IPs) and open an empty composer — sharing must
  // always hand them the public URL.
  return new URL(pathname, siteUrl).toString();
}

/**
 * The article page's share row — Facebook/X/LinkedIn/email intents plus
 * copy-link, all against the canonical current URL. Plain intent URLs in
 * new tabs, no SDK embeds (nothing to load, works for a static page).
 * Rendered twice per article (sticky side rail on wide screens, footer
 * row under the body) — same component, different `orientation`.
 */
export function ShareButtons({
  title,
  orientation = "horizontal",
  labels,
}: {
  title: string;
  orientation?: "horizontal" | "vertical";
  labels: {
    facebook: string;
    x: string;
    linkedin: string;
    email: string;
    copyLink: string;
    linkCopied: string;
  };
}) {
  const url = useShareUrl();

  function openShare(shareUrl: string) {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(labels.linkCopied);
    } catch {
      // Clipboard access denied — nothing actionable to tell the reader.
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      label: labels.facebook,
      icon: FacebookIcon,
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`),
    },
    {
      label: labels.x,
      icon: XIcon,
      onClick: () => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`),
    },
    {
      label: labels.linkedin,
      icon: LinkedinIcon,
      onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`),
    },
    {
      label: labels.email,
      icon: Mail,
      onClick: () => {
        window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
      },
    },
    { label: labels.copyLink, icon: LinkIcon, onClick: copyLink },
  ];

  return (
    <div className={cn("flex gap-2", orientation === "vertical" ? "flex-col" : "flex-row")}>
      {targets.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          title={label}
          aria-label={label}
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
      ))}
    </div>
  );
}
