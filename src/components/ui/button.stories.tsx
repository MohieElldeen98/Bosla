import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Button } from "./button"

const meta = {
  component: Button,
  tags: ["ai-generated"],
  args: {
    children: "Browse Courses",
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — one is enough per file
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /browse courses/i })).toBeVisible()
  },
}

// Variant-only stories: no play needed
export const Outline: Story = { args: { variant: "outline" } }
export const Secondary: Story = { args: { variant: "secondary" } }
export const Ghost: Story = { args: { variant: "ghost" } }
export const Destructive: Story = { args: { variant: "destructive", children: "Delete account" } }
export const Link: Story = { args: { variant: "link" } }
export const Small: Story = { args: { size: "sm" } }
export const Large: Story = { args: { size: "lg" } }
export const Disabled: Story = { args: { disabled: true } }

// The single CssCheck story for the whole project — proves the shared
// preview actually loaded Tailwind + the design-token stylesheet.
export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /browse courses/i })
    // Default variant uses bg-primary, which resolves to the brand indigo
    // (--primary: oklch(0.478 0.192 265.5) in src/app/globals.css) — fails
    // if Tailwind / the design-token stylesheet did not load. Chromium's
    // getComputedStyle reports modern color syntaxes in the same oklch()
    // notation Tailwind emits, not converted to rgb().
    await expect(getComputedStyle(button).backgroundColor).toBe("oklch(0.478 0.192 265.5)")
  },
}
