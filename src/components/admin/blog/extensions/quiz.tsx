"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface QuizChoice {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface QuizAttrs {
  question: string;
  choices: QuizChoice[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    quiz: {
      insertQuiz: () => ReturnType;
    };
  }
}

function defaultChoices(): QuizChoice[] {
  return [
    { text: "", correct: true, feedback: "" },
    { text: "", correct: false, feedback: "" },
  ];
}

/** Belt-and-braces against malformed attrs (old content saved before the
 *  `rendered: false` fix, or hand-crafted markup) — anything that isn't a
 *  proper choices array degrades to the default pair instead of crashing
 *  `renderHTML`. */
function normalizeAttrs(attrs: Record<string, unknown>): QuizAttrs {
  const choices = Array.isArray(attrs.choices)
    ? (attrs.choices as QuizChoice[]).map((choice) => ({
        text: typeof choice?.text === "string" ? choice.text : "",
        correct: choice?.correct === true,
        feedback: typeof choice?.feedback === "string" ? choice.feedback : "",
      }))
    : [];
  return {
    question: typeof attrs.question === "string" ? attrs.question : "",
    choices: choices.length >= 2 ? choices : defaultChoices(),
  };
}

/**
 * The quiz's editing surface — an atom NodeView (the quiz is data, not
 * free-form document content): question input, a choices list where one
 * radio marks the correct answer, and per-choice feedback shown to the
 * reader after answering. All state lives in the node's attributes, so
 * undo/redo and serialization come for free.
 */
function QuizNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const t = useTranslations("Admin.articleEditor.quiz");
  const attrs = normalizeAttrs(node.attrs);

  function patchChoice(index: number, patch: Partial<QuizChoice>) {
    const choices = attrs.choices.map((choice, i) => (i === index ? { ...choice, ...patch } : choice));
    updateAttributes({ choices });
  }

  function markCorrect(index: number) {
    updateAttributes({
      choices: attrs.choices.map((choice, i) => ({ ...choice, correct: i === index })),
    });
  }

  function addChoice() {
    updateAttributes({ choices: [...attrs.choices, { text: "", correct: false, feedback: "" }] });
  }

  function removeChoice(index: number) {
    if (attrs.choices.length <= 2) return;
    const removed = attrs.choices[index];
    let choices = attrs.choices.filter((_, i) => i !== index);
    // Never leave a quiz without a correct answer.
    if (removed.correct && choices.length > 0) {
      choices = choices.map((choice, i) => ({ ...choice, correct: i === 0 }));
    }
    updateAttributes({ choices });
  }

  return (
    <NodeViewWrapper
      className={cn(
        "my-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-4",
        selected && "border-primary/60",
      )}
      data-drag-handle
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("blockLabel")}</p>
        <Button type="button" variant="ghost" size="icon-sm" onClick={deleteNode} aria-label={t("deleteQuiz")}>
          <Trash2 aria-hidden="true" className="size-4 text-destructive" />
        </Button>
      </div>

      <Input
        value={attrs.question}
        onChange={(event) => updateAttributes({ question: event.target.value })}
        placeholder={t("questionPlaceholder")}
        dir="auto"
        className="mb-3 font-medium"
      />

      <div className="space-y-2">
        {attrs.choices.map((choice, index) => (
          <div key={index} className="rounded-lg border border-border bg-background p-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markCorrect(index)}
                title={t("markCorrect")}
                aria-label={t("markCorrect")}
                aria-pressed={choice.correct}
                className={cn(
                  "shrink-0 rounded-full transition-colors",
                  choice.correct ? "text-emerald-600" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {choice.correct ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
              </button>
              <Input
                value={choice.text}
                onChange={(event) => patchChoice(index, { text: event.target.value })}
                placeholder={t("choicePlaceholder")}
                dir="auto"
                className="h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeChoice(index)}
                disabled={attrs.choices.length <= 2}
                aria-label={t("removeChoice")}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <Input
              value={choice.feedback}
              onChange={(event) => patchChoice(index, { feedback: event.target.value })}
              placeholder={t("feedbackPlaceholder")}
              dir="auto"
              className="mt-2 h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addChoice}>
        <Plus aria-hidden="true" className="size-4" />
        {t("addChoice")}
      </Button>
    </NodeViewWrapper>
  );
}

/**
 * An interactive multiple-choice question — the lesson-page `.quiz`
 * pattern as a first-class editor block. Serialized to the exact markup
 * the sanitizer allowlists and `ArticleQuizzes` (the public page's
 * hydrator) makes clickable:
 *
 *   <div class="quiz">
 *     <p class="quiz-question">…</p>
 *     <div class="quiz-choices">
 *       <button class="quiz-choice" data-correct="true|false" data-feedback="…">…</button>
 *     </div>
 *     <p class="quiz-feedback" hidden></p>
 *   </div>
 */
export const Quiz = Node.create({
  name: "quiz",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      // `rendered: false` — the `.quiz` child structure below is the real
      // serialization; without it Tiptap also stringifies these onto the
      // wrapper element, and re-parsing that (e.g. the language switch
      // recreating the editor from HTML) hands back `choices` as a string.
      question: { default: "", rendered: false },
      choices: { default: defaultChoices(), rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.quiz",
        getAttrs: (element) => {
          const question = element.querySelector(".quiz-question")?.textContent ?? "";
          const choices: QuizChoice[] = Array.from(element.querySelectorAll("button.quiz-choice")).map(
            (button) => ({
              text: button.textContent ?? "",
              correct: button.getAttribute("data-correct") === "true",
              feedback: button.getAttribute("data-feedback") ?? "",
            }),
          );
          return { question, choices: choices.length >= 2 ? choices : defaultChoices() };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = normalizeAttrs(node.attrs);
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "quiz" }),
      ["p", { class: "quiz-question" }, attrs.question],
      [
        "div",
        { class: "quiz-choices" },
        ...attrs.choices.map(
          (choice) =>
            [
              "button",
              {
                class: "quiz-choice",
                type: "button",
                "data-correct": String(choice.correct),
                "data-feedback": choice.feedback,
              },
              choice.text,
            ] as const,
        ),
      ],
      // Empty until answered — `.quiz-feedback:empty` keeps it hidden
      // (sanitize-html strips boolean attributes like `hidden`, so the
      // emptiness itself is the state).
      ["p", { class: "quiz-feedback" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuizNodeView);
  },

  addCommands() {
    return {
      insertQuiz:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { question: "", choices: defaultChoices() } }),
    };
  },
});
