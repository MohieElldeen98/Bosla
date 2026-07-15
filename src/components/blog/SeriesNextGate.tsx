"use client";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function SeriesNextGate({ href, children, hint }: { href: string; children: React.ReactNode; hint: string }) {
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    const check = () => {
      const quizzes = document.querySelectorAll("#article-body .quiz");
      if (!document.getElementById("article-body") || quizzes.length === 0 || Array.from(quizzes).every((q) => Array.from(q.querySelectorAll<HTMLButtonElement>("button.quiz-choice")).every((b) => b.disabled))) setLocked(false);
    };
    check();
    document.addEventListener("bosla:quiz-answered", check);
    return () => document.removeEventListener("bosla:quiz-answered", check);
  }, []);
  return locked ? <div aria-disabled="true" className="relative opacity-50">{children}<Lock className="absolute end-5 top-5 size-4" aria-hidden="true" /><div className="mt-2 text-xs text-muted-foreground">{hint}</div></div> : <Link href={href} className="block">{children}</Link>;
}
