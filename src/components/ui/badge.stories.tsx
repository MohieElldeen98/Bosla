import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Badge } from "./badge"

const meta = {
  component: Badge,
  tags: ["ai-generated"],
  args: {
    children: "Featured",
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — one is enough per file
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Featured")).toBeVisible()
  },
}

// Variant-only stories: no play needed
export const Secondary: Story = { args: { variant: "secondary" } }
export const Destructive: Story = { args: { variant: "destructive", children: "Expired" } }
export const Outline: Story = { args: { variant: "outline" } }
export const Ghost: Story = { args: { variant: "ghost" } }
export const Link: Story = { args: { variant: "link" } }
