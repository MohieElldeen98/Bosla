import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import type { ResolvedFaqSectionContent } from "@/cms/types/section";

export function FaqSection({ content }: { content: ResolvedFaqSectionContent }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {content.eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.title}
        </h2>
      </div>

      <Reveal className="mt-12 rounded-2xl border border-border bg-card px-6">
        <Accordion>
          {content.items.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
