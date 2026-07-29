import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"

import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"

const meta = {
  component: Tabs,
  tags: ["ai-generated"],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

// Smoke check — clicking a tab actually switches the selected panel
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="courses" className="w-96">
      <TabsList>
        <TabsTab value="courses">Courses</TabsTab>
        <TabsTab value="certificates">Certificates</TabsTab>
      </TabsList>
      <TabsPanel value="courses">Your enrolled courses appear here.</TabsPanel>
      <TabsPanel value="certificates">Your earned certificates appear here.</TabsPanel>
    </Tabs>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Your enrolled courses appear here.")).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "Certificates" }))
    await expect(canvas.getByText("Your earned certificates appear here.")).toBeVisible()
  },
}
