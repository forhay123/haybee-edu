import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";


const meta: Meta<typeof Button> = {
  title: "Base/Button",
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { label: "Click me", variant: "primary" },
};
export const Secondary: Story = {
  args: { label: "Cancel", variant: "secondary" },
};
