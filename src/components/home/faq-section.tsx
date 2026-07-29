"use client";

import { useTranslations } from "next-intl";
import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

export function FaqSection() {
  const t = useTranslations("Faq");
  const items = t.raw("items") as Array<{ question: string; answer: string }>;

  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-bold text-foreground">{t("title")}</h2>
      </div>
      <Accordion className="mt-12">
        {items.map((item, index) => (
          <Accordion.Item key={index}>
            <Accordion.Heading>
              <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-start font-medium text-foreground">
                {item.question}
                <Accordion.Indicator>
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pb-4 text-sm text-muted-foreground">
                {item.answer}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
