import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

const meta = {
  component: Card,
  tags: ["ai-generated"],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — one is enough per file
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Shoulder Rehab Masterclass</CardTitle>
        <CardDescription>Assessment to Return-to-Function</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Save
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Evidence-based courses for physiotherapists and nutrition specialists.</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Enroll now</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Shoulder Rehab Masterclass")).toBeVisible()
    await expect(canvas.getByRole("button", { name: /enroll now/i })).toBeVisible()
  },
}

// Variant-only story: no play needed
export const Small: Story = {
  render: () => (
    <Card size="sm" className="w-72">
      <CardHeader>
        <CardTitle>Introduction to Clinical Reasoning</CardTitle>
      </CardHeader>
      <CardContent>
        <p>A compact card, used in dense grid layouts.</p>
      </CardContent>
    </Card>
  ),
}
