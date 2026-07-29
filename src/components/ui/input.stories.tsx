import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Input } from "./input"

const meta = {
  component: Input,
  tags: ["ai-generated"],
  args: {
    placeholder: "you@example.com",
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — proves typed input actually lands in the field
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByPlaceholderText("you@example.com")
    await userEvent.type(field, "student@example.com")
    await expect(field).toHaveValue("student@example.com")
  },
}

// Variant-only stories: no play needed
export const Email: Story = { args: { type: "email", placeholder: "you@example.com" } }
export const Password: Story = { args: { type: "password", placeholder: "Password" } }
export const Disabled: Story = { args: { disabled: true, placeholder: "Disabled field" } }
export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "not-an-email" } }
