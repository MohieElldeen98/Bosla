"use client";

import { useEffect } from "react";

/**
 * Makes the article body's quiz blocks answerable — the server renders
 * them as inert sanitized HTML (`.quiz` / `.quiz-choice` buttons with
 * `data-correct`/`data-feedback`), and this attaches one delegated click
 * handler to the body container. Answering reveals the correct choice,
 * marks a wrong pick, shows that choice's feedback, and locks the
 * question. Renders nothing itself; articles without quizzes pay nothing
 * beyond the no-op listener.
 */
export function ArticleQuizzes({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    function handleClick(event: MouseEvent) {
      const choice = (event.target as HTMLElement).closest<HTMLButtonElement>("button.quiz-choice");
      if (!choice || choice.disabled) return;
      const quiz = choice.closest<HTMLElement>(".quiz");
      if (!quiz) return;

      const choices = Array.from(quiz.querySelectorAll<HTMLButtonElement>("button.quiz-choice"));
      for (const button of choices) {
        button.disabled = true;
        if (button.getAttribute("data-correct") === "true") button.classList.add("is-correct");
      }
      if (choice.getAttribute("data-correct") !== "true") {
        choice.classList.add("is-wrong");
      }

      // Setting the text is what reveals it — `.quiz-feedback:empty`
      // hides the unanswered state.
      const feedback = quiz.querySelector<HTMLElement>(".quiz-feedback");
      const message = choice.getAttribute("data-feedback");
      if (feedback && message) {
        feedback.textContent = message;
      }
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerId]);

  return null;
}
