import { getTranslations } from "next-intl/server";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import type { Locale } from "@/i18n/routing";

interface FaqItem {
  question: string;
  answer: string;
}

export async function FaqSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Faq" });
  const items = t.raw("items") as FaqItem[];

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
        </div>

        <Reveal className="mt-12 rounded-2xl border border-border bg-card px-6">
          <Accordion>
            {items.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
