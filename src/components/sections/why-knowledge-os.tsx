"use client";

import { motion } from "framer-motion";
import { getWhyBoslaIcon } from "@/lib/why-bosla-icons";
import type { ResolvedWhyBoslaSectionContent } from "@/cms/types/section";

export function WhyKnowledgeOs({ content }: { content: ResolvedWhyBoslaSectionContent }) {
  return (
    <section id="about" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {content.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-3 text-muted-foreground">{content.subtitle}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((item, index) => {
            const Icon = getWhyBoslaIcon(item.icon);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
