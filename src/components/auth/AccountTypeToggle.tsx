"use client";

import { cn } from "@/lib/utils";
import type { SignUpAccountType } from "@/auth/validators/sign-up.validator";

interface AccountTypeToggleProps {
  value: SignUpAccountType;
  onValueChange: (value: SignUpAccountType) => void;
  studentLabel: string;
  instructorLabel: string;
  name?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Segmented Student/Instructor picker for `SignUpForm` — selecting
 *  "Instructor" doesn't grant the role at sign-up (that stays approval-gated,
 *  see `AuthService.signUp`); it just auto-submits the same pending
 *  `instructor_profiles` application an existing student would otherwise
 *  fill in later from `/me/apply-instructor`. */
export function AccountTypeToggle({
  value,
  onValueChange,
  studentLabel,
  instructorLabel,
  name,
  id,
  ...aria
}: AccountTypeToggleProps) {
  const options: { value: SignUpAccountType; label: string }[] = [
    { value: "student", label: studentLabel },
    { value: "instructor", label: instructorLabel },
  ];

  return (
    <div
      id={id}
      role="radiogroup"
      className="inline-flex w-full gap-2 rounded-full border border-input bg-muted/40 p-1"
      {...aria}
    >
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              checked
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
