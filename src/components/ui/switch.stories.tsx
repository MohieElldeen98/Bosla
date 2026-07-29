import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Switch } from "./switch"

const meta = {
  component: Switch,
  tags: ["ai-generated"],
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — proves the checked state (aria-checked) actually toggles on click
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("switch")
    await expect(toggle).toHaveAttribute("aria-checked", "false")
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute("aria-checked", "true")
  },
}

// Variant-only stories: no play needed
export const On: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
