import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Checkbox } from "./checkbox"

const meta = {
  component: Checkbox,
  tags: ["ai-generated"],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — proves the checked state (aria-checked) actually toggles on click
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox")
    await expect(box).toHaveAttribute("aria-checked", "false")
    await userEvent.click(box)
    await expect(box).toHaveAttribute("aria-checked", "true")
  },
}

// Variant-only stories: no play needed
export const Checked: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } }
