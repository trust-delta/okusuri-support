import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '../button/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes to apply to the card',
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content area.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  args: {},
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card includes a footer section.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with additional footer information.</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">Footer information</p>
      </CardFooter>
    </Card>
  ),
}

export const WithAction: Story = {
  args: {},
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card with Action</CardTitle>
        <CardDescription>This card has an action button in the header.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            Action
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>This card demonstrates the action slot in the header.</p>
      </CardContent>
    </Card>
  ),
}

export const Complete: Story = {
  args: {},
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Complete Card Example</CardTitle>
        <CardDescription>A fully featured card with all components.</CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            ⋯
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>This card demonstrates all available components:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>CardHeader with title and description</li>
            <li>CardAction for header buttons</li>
            <li>CardContent for main content</li>
            <li>CardFooter for additional actions</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button className="flex-1">Confirm</Button>
        </div>
      </CardFooter>
    </Card>
  ),
}

export const PatientCard: Story = {
  args: {},
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>田中 太郎</CardTitle>
        <CardDescription>患者ID: P-001 | 年齢: 65歳</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            編集
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">服薬状況:</span>
            <span className="text-sm text-green-600">良好</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">最終服薬:</span>
            <span className="text-sm">2025-08-18 08:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">処方薬数:</span>
            <span className="text-sm">3種類</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">服薬記録を確認</Button>
      </CardFooter>
    </Card>
  ),
}

// Interactive story showing multiple cards
export const MultipleCards: Story = {
  args: {},
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple Card</CardTitle>
          <CardDescription>Basic card example</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Simple content</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card with Action</CardTitle>
          <CardDescription>Includes header action</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline">
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Content with action</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Featured</CardTitle>
          <CardDescription>Complete card example</CardDescription>
          <CardAction>
            <Button size="sm" variant="ghost">
              ⋯
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Content area</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button className="flex-1 ml-2">Save</Button>
        </CardFooter>
      </Card>
    </div>
  ),
}
