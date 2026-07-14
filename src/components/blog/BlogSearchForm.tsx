"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/**
 * The blog header's search box — submits `?q=` as a real navigation (a
 * server round-trip through the listing page's own search), keeping any
 * active `category` filter. A form, not a debounced live search: the
 * listing is ISR-cached per URL, so navigating on submit is the natural
 * unit here, and Enter-to-search matches the reference pattern.
 */
export function BlogSearchForm({
  initialQuery,
  category,
  placeholder,
  label,
}: {
  initialQuery: string;
  category: string | null;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (category) params.set("category", category);
    const query = params.toString();
    router.push(query ? `/blog?${query}` : "/blog");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-14 w-full rounded-2xl border border-input bg-background ps-5 pe-14 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <button
        type="submit"
        aria-label={label}
        className="absolute end-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}
