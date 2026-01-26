# Card

A flexible card component system built with composition in mind, providing structure for content containers with headers, actions, content areas, and footers.

## Import

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@sundayhug/ui/components/card";
```

## Overview

The Card component provides a consistent, composable interface for creating content containers. It uses a modular design where individual subcomponents (Header, Title, Description, Action, Content, Footer) can be combined to create various card layouts. The CardHeader includes an intelligent grid system that automatically adapts when CardAction is present.

## Subcomponents

### Card

The main container component that wraps all card content.

```tsx
<Card>
  {/* Card content */}
</Card>
```

**Styling:**
- Background: card background color with card foreground text
- Rounded corners: rounded-xl
- Border with shadow-sm for subtle depth
- Flex column layout with 6px gap (gap-6)
- Vertical padding: 24px (py-6)
- Data attribute: `data-slot="card"`

### CardHeader

The header section with intelligent grid layout that adapts to content.

```tsx
<CardHeader>
  <CardTitle>Title</CardTitle>
  <CardDescription>Description</CardDescription>
</CardHeader>
```

**Styling:**
- Container query context (@container/card-header)
- Grid layout with auto rows and 2 rows
- Grid columns: auto by default, [1fr auto] when CardAction is present
- 6px gap between elements (gap-1.5)
- Horizontal padding: 24px (px-6)
- Conditional bottom padding: 24px when border-b class is present
- Data attribute: `data-slot="card-header"`

**Layout Behavior:**
- Without CardAction: Single column grid
- With CardAction: Two-column grid with action in the second column
- Items aligned to start for flexible content heights

### CardTitle

The title text element within the card header.

```tsx
<CardTitle>Card Title</CardTitle>
```

**Styling:**
- Font weight: semibold
- Leading: none (tight line height)
- Data attribute: `data-slot="card-title"`

### CardDescription

The description text element within the card header.

```tsx
<CardDescription>A brief description of the card content.</CardDescription>
```

**Styling:**
- Text color: muted foreground
- Text size: small (text-sm)
- Data attribute: `data-slot="card-description"`

### CardAction

An action element (button, menu, etc.) that positions in the header.

```tsx
<CardAction>
  <Button size="icon" variant="ghost">
    <MoreVertical />
  </Button>
</CardAction>
```

**Styling:**
- Grid positioning: column 2, rows 1-2 (spans both title and description)
- Self-aligned to start (top)
- Justified to end (right)
- Data attribute: `data-slot="card-action"`

**Behavior:**
- Automatically triggers two-column layout in CardHeader
- Aligns with the top of the header regardless of title/description height

### CardContent

The main content area of the card.

```tsx
<CardContent>
  {/* Main card content */}
</CardContent>
```

**Styling:**
- Horizontal padding: 24px (px-6)
- Data attribute: `data-slot="card-content"`

### CardFooter

The footer section for actions or additional information.

```tsx
<CardFooter>
  <Button>Action</Button>
</CardFooter>
```

**Styling:**
- Flex layout with items centered
- Horizontal padding: 24px (px-6)
- Conditional top padding: 24px when border-t class is present
- Data attribute: `data-slot="card-footer"`

## Usage Examples

### Example 1: Basic Card

Simple card with title, description, and content.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@sundayhug/ui/components/card";

export function BasicCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>
          Follow these steps to set up your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Welcome to our platform! Let's get you started with the basics.</p>
      </CardContent>
    </Card>
  );
}
```

### Example 2: Card with Action

Card with a menu or action button in the header.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@sundayhug/ui/components/card";
import { Button } from "@sundayhug/ui/components/button";
import { MoreVertical } from "lucide-react";

export function CardWithAction() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>Last updated 2 hours ago</CardDescription>
        <CardAction>
          <Button size="icon" variant="ghost">
            <MoreVertical />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Your project is progressing well with 12 tasks completed.</p>
      </CardContent>
    </Card>
  );
}
```

### Example 3: Card with Footer

Card with action buttons in the footer.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@sundayhug/ui/components/card";
import { Button } from "@sundayhug/ui/components/button";

export function CardWithFooter() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>
          Are you sure you want to proceed with this action?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This action cannot be undone. Please confirm to continue.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  );
}
```

### Example 4: Card with Separated Sections

Card using border classes to visually separate sections.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@sundayhug/ui/components/card";
import { Button } from "@sundayhug/ui/components/button";

export function SeparatedCard() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Manage your account preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Update your profile information and preferences here.</p>
      </CardContent>
      <CardFooter className="border-t">
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
```

### Example 5: Card with Complex Content

Card containing a list or structured content.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@sundayhug/ui/components/card";
import { CheckCircle2 } from "lucide-react";

export function TaskCard() {
  const tasks = [
    { id: 1, title: "Complete onboarding", done: true },
    { id: 2, title: "Set up profile", done: true },
    { id: 3, title: "Invite team members", done: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Progress</CardTitle>
        <CardDescription>2 of 3 tasks completed</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <CheckCircle2
                className={`size-4 ${task.done ? "text-green-500" : "text-muted-foreground"}`}
              />
              <span className={task.done ? "line-through" : ""}>
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

### Example 6: Compact Card

Minimal card without header, using only content.

```tsx
import { Card, CardContent } from "@sundayhug/ui/components/card";

export function CompactCard() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-semibold text-primary">42</span>
          </div>
          <div>
            <p className="font-semibold">Active Users</p>
            <p className="text-sm text-muted-foreground">+12% from last week</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Example 7: Card Grid Layout

Multiple cards in a responsive grid.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@sundayhug/ui/components/card";

export function CardGrid() {
  const features = [
    { title: "Fast", description: "Optimized for performance" },
    { title: "Secure", description: "End-to-end encryption" },
    { title: "Scalable", description: "Grows with your needs" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {features.map((feature) => (
        <Card key={feature.title}>
          <CardHeader>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Learn more about our {feature.title.toLowerCase()} approach.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Example 8: Interactive Card

Card with hover and click interactions.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@sundayhug/ui/components/card";
import { ArrowRight } from "lucide-react";

export function InteractiveCard() {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Documentation
          <ArrowRight className="size-4" />
        </CardTitle>
        <CardDescription>Learn how to use our components</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Comprehensive guides and API references for all components.</p>
      </CardContent>
    </Card>
  );
}
```

### Example 9: Card with Image

Card featuring an image or media content.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@sundayhug/ui/components/card";
import { Button } from "@sundayhug/ui/components/button";

export function ImageCard() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full bg-muted" />
      <CardHeader>
        <CardTitle>Featured Article</CardTitle>
        <CardDescription>Published on Jan 15, 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          Discover the latest trends and best practices in modern web
          development.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Read More</Button>
      </CardFooter>
    </Card>
  );
}
```

### Example 10: Form Card

Card containing form elements.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@sundayhug/ui/components/card";
import { Input } from "@sundayhug/ui/components/input";
import { Button } from "@sundayhug/ui/components/button";

export function FormCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input id="password" type="password" placeholder="Enter password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Sign In</Button>
      </CardFooter>
    </Card>
  );
}
```

## Composition Patterns

The Card component system is designed for flexible composition. Here are key patterns:

### Pattern 1: Optional Subcomponents

Use only the subcomponents you need. All are optional except Card itself.

```tsx
// Minimal card - just content
<Card>
  <CardContent>Simple content</CardContent>
</Card>

// Header only
<Card>
  <CardHeader>
    <CardTitle>Title Only</CardTitle>
  </CardHeader>
</Card>

// Full composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction>{/* Action */}</CardAction>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Footer */}</CardFooter>
</Card>
```

### Pattern 2: Header Grid Layout

CardHeader automatically adapts its grid when CardAction is present.

```tsx
// Two-row, single-column (no action)
<CardHeader>
  <CardTitle>Title</CardTitle>
  <CardDescription>Description</CardDescription>
</CardHeader>

// Two-row, two-column (with action)
<CardHeader>
  <CardTitle>Title</CardTitle>
  <CardDescription>Description</CardDescription>
  <CardAction>
    <Button size="icon" variant="ghost">
      <Settings />
    </Button>
  </CardAction>
</CardHeader>
```

### Pattern 3: Section Separation

Use border utilities to create visual separation between sections.

```tsx
<Card>
  {/* Border bottom creates space below header */}
  <CardHeader className="border-b">
    <CardTitle>Title</CardTitle>
  </CardHeader>

  <CardContent>Content</CardContent>

  {/* Border top creates space above footer */}
  <CardFooter className="border-t">
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Border Behavior:**
- `border-b` on CardHeader: Adds 24px bottom padding
- `border-t` on CardFooter: Adds 24px top padding
- Border color automatically adapts to theme

### Pattern 4: Custom Styling

All subcomponents accept className for customization.

```tsx
<Card className="max-w-md">
  <CardHeader className="bg-muted">
    <CardTitle className="text-2xl">Custom Styled Card</CardTitle>
    <CardDescription className="text-base">
      Larger description text
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content with custom spacing */}
  </CardContent>
  <CardFooter className="justify-between">
    <Button variant="outline">Back</Button>
    <Button>Next</Button>
  </CardFooter>
</Card>
```

## Accessibility

The Card component includes several accessibility features:

- **Semantic HTML**: All subcomponents use semantic div elements with clear data-slot attributes
- **Data Attributes**: Each subcomponent has a unique `data-slot` for testing and styling
- **Flexible Content**: Works seamlessly with any content, maintaining accessibility of child elements
- **Focus Management**: Card itself doesn't trap focus, allowing natural keyboard navigation of interactive children
- **Screen Readers**: Logical content flow ensures screen readers announce content in the correct order

### Accessibility Best Practices

1. **Use heading elements**: Place proper heading tags (h2, h3, etc.) within CardTitle for semantic structure
   ```tsx
   <CardTitle>
     <h2>Account Settings</h2>
   </CardTitle>
   ```

2. **Descriptive actions**: Ensure buttons in CardAction have clear labels
   ```tsx
   <CardAction>
     <Button size="icon" variant="ghost" aria-label="Open menu">
       <MoreVertical />
     </Button>
   </CardAction>
   ```

3. **Interactive cards**: If the entire card is clickable, use proper ARIA roles
   ```tsx
   <Card
     role="article"
     tabIndex={0}
     onClick={handleClick}
     onKeyDown={(e) => e.key === 'Enter' && handleClick()}
   >
     {/* Content */}
   </Card>
   ```

4. **Form cards**: Properly label all form elements within cards
   ```tsx
   <Card>
     <CardContent>
       <label htmlFor="name">Name</label>
       <Input id="name" />
     </CardContent>
   </Card>
   ```

## Styling Details

### Layout System

**Card Container:**
- Flexbox column layout with automatic gap (gap-6)
- Prevents content from collapsing together
- Consistent spacing regardless of subcomponents used

**CardHeader Grid:**
- CSS Grid with container queries (@container/card-header)
- Auto-sizing rows that adapt to content height
- Intelligent column handling:
  - Default: Single column for title and description
  - With CardAction: `grid-cols-[1fr_auto]` creates two columns
- Uses `has-data-[slot=card-action]:grid-cols-[1fr_auto]` selector to detect CardAction

**CardAction Positioning:**
- `col-start-2`: Places in second column
- `row-span-2 row-start-1`: Spans both title and description rows
- `self-start justify-self-end`: Aligns to top-right corner

### Spacing

All horizontal spacing is consistent at 24px (px-6):
- CardHeader: px-6
- CardContent: px-6
- CardFooter: px-6

Vertical spacing:
- Card container: py-6 (top and bottom padding)
- Gap between sections: gap-6 (24px)
- CardHeader internal gap: gap-1.5 (6px)

Conditional spacing:
- `.border-b` on CardHeader: Adds pb-6 (24px bottom padding)
- `.border-t` on CardFooter: Adds pt-6 (24px top padding)

### Colors and Borders

**Card Container:**
- Background: `bg-card` (theme-aware)
- Text: `text-card-foreground` (theme-aware)
- Border: `border` (single pixel border with theme color)
- Shadow: `shadow-sm` (subtle shadow for depth)
- Border radius: `rounded-xl` (12px)

**CardDescription:**
- Text color: `text-muted-foreground` (reduced emphasis)
- Font size: `text-sm` (14px)

**CardTitle:**
- Font weight: `font-semibold` (600)
- Line height: `leading-none` (tight, no extra spacing)

### Dark Mode

All theme colors automatically adapt to dark mode:
- Card background and foreground
- Border colors
- Muted foreground for descriptions
- Shadows adjust appropriately

### Container Queries

CardHeader uses container queries (@container/card-header) to enable responsive behavior based on the card's size rather than viewport size. This makes cards more portable across different layouts.

## Notes

- The component uses the `cn` utility for className merging
- All styles are Tailwind CSS classes
- Each subcomponent has a unique `data-slot` attribute for easy targeting
- CardAction automatically triggers a two-column layout in CardHeader through CSS
- Border classes (`border-b`, `border-t`) affect spacing automatically
- The gap-6 spacing creates consistent vertical rhythm
- CardHeader's grid system handles dynamic content heights gracefully
- All subcomponents forward refs and accept standard HTML div props
- Container queries enable responsive cards regardless of viewport size
