import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

const meta = {
  component: Avatar,
  tags: ["ai-generated"],
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — no image src means the fallback initials must render
export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>DY</AvatarFallback>
    </Avatar>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("DY")).toBeVisible()
  },
}

// Variant-only story: no play needed
export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/64" alt="Dr. Yasmine El-Sayed" />
      <AvatarFallback>DY</AvatarFallback>
    </Avatar>
  ),
}
