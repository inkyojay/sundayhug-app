# @sundayhug/ui

A comprehensive UI component library built on [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/), customized for the SundayHug application ecosystem.

## Overview

`@sundayhug/ui` provides a collection of 20+ accessible, customizable React components that are shared across SundayHug applications (customer app and dashboard). All components are built with TypeScript, styled with Tailwind CSS, and designed to work seamlessly together.

### Key Features

- ✨ **20+ Production-Ready Components** - From buttons to complex dialogs and sidebars
- ♿ **Accessible by Default** - Built on Radix UI primitives with ARIA support
- 🎨 **Customizable Variants** - Flexible styling with class-variance-authority
- 📦 **Tree-Shakeable** - Import only what you need
- 🔧 **TypeScript First** - Full type safety and IntelliSense support
- 🌗 **Dark Mode Ready** - All components support dark mode out of the box

## Installation

This package is part of the SundayHug monorepo and is not published to npm. It's consumed internally by workspace applications.

### In Your App

If you're working within the monorepo, add the package to your app's dependencies:

```json
{
  "dependencies": {
    "@sundayhug/ui": "workspace:*"
  }
}
```

Then install dependencies:

```bash
pnpm install
```

### Peer Dependencies

Ensure your application has the required peer dependencies:

```bash
pnpm add react@^19.0.0 react-dom@^19.0.0
```

## Quick Start

### Basic Usage

Import components directly from the package:

```tsx
import { Button } from "@sundayhug/ui";

export function MyComponent() {
  return (
    <Button variant="default" size="default">
      Click me
    </Button>
  );
}
```

### Using Variants

Most components support multiple variants for different use cases:

```tsx
import { Button, Badge, Alert } from "@sundayhug/ui";

export function Example() {
  return (
    <div>
      {/* Button variants */}
      <Button variant="default">Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      {/* Button sizes */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">⚙️</Button>

      {/* Other components */}
      <Badge variant="default">New</Badge>
      <Alert variant="destructive">Error message</Alert>
    </div>
  );
}
```

### Importing Styles

The UI package requires Tailwind CSS. Import the component styles in your app:

```tsx
import "@sundayhug/ui/styles.css";
```

### Using the `cn` Utility

The package exports a `cn` utility function for combining Tailwind classes:

```tsx
import { Button, cn } from "@sundayhug/ui";

export function CustomButton() {
  return (
    <Button className={cn("custom-class", "another-class")}>
      Custom Button
    </Button>
  );
}
```

## Available Components

### Form Elements
- [Button](./docs/components/button.md) - Versatile button component with multiple variants
- [Input](./docs/components/input.md) - Text input field
- [Textarea](./docs/components/textarea.md) - Multi-line text input
- [Checkbox](./docs/components/checkbox.md) - Checkbox input with label support
- [Radio Group](./docs/components/radio-group.md) - Radio button group
- [Select](./docs/components/select.md) - Dropdown select component
- [Label](./docs/components/label.md) - Form label component
- [Input OTP](./docs/components/input-otp.md) - One-time password input

### Layout & Structure
- [Card](./docs/components/card.md) - Card container with header, content, and footer
- [Separator](./docs/components/separator.md) - Visual divider
- [Tabs](./docs/components/tabs.md) - Tabbed interface
- [Table](./docs/components/table.md) - Data table component
- [Collapsible](./docs/components/collapsible.md) - Expandable content section
- [Sidebar](./docs/components/sidebar.md) - Application sidebar navigation

### Overlays & Dialogs
- [Dialog](./docs/components/dialog.md) - Modal dialog
- [Sheet](./docs/components/sheet.md) - Slide-in panel
- [Dropdown Menu](./docs/components/dropdown-menu.md) - Dropdown menu with nested items
- [Tooltip](./docs/components/tooltip.md) - Hover tooltip

### Feedback & Display
- [Alert](./docs/components/alert.md) - Alert/notification component
- [Badge](./docs/components/badge.md) - Status badge or label
- [Avatar](./docs/components/avatar.md) - User avatar with fallback
- [Skeleton](./docs/components/skeleton.md) - Loading skeleton placeholder
- [Sonner](./docs/components/sonner.md) - Toast notifications

## Component Patterns

### Compound Components

Many components follow a compound component pattern for flexibility:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@sundayhug/ui";

export function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your profile settings</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Content here */}
      </CardContent>
      <CardFooter>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
```

### Asynchronous Rendering

Some components support the `asChild` prop for composition:

```tsx
import { Button } from "@sundayhug/ui";
import Link from "next/link";

export function NavButton() {
  return (
    <Button asChild>
      <Link href="/dashboard">Go to Dashboard</Link>
    </Button>
  );
}
```

## Real-World Examples

Looking for complete, production-ready examples? Check out our [Examples Guide](./docs/examples.md) featuring:

- **Login Form with Validation** - Complete form with error handling and user feedback
- **Confirmation Dialogs** - Reusable dialog patterns for destructive actions
- **User Profile Cards** - Card compositions with avatars and badges
- **Navigation Menus** - Feature-rich dropdown menus with nested items
- **Data Tables with Actions** - Tables with row actions and status indicators
- **Settings Panels** - Tabbed interfaces with forms and preferences
- **Contact Forms** - Multi-field forms with textarea and validation
- **Dashboard Stats** - Stat cards with data visualization

Each example includes complete, copy-paste-ready code demonstrating component composition, state management, and common UI patterns.

👉 **[View All Examples](./docs/examples.md)**

## Development

### Type Safety

All components are fully typed. Use TypeScript for the best development experience:

```tsx
import type { ButtonProps } from "@sundayhug/ui";

// Component props are exported for reuse
const customButtonProps: ButtonProps = {
  variant: "outline",
  size: "lg",
  onClick: () => console.log("clicked")
};
```

### Customization

Components accept standard React props and can be customized via `className`:

```tsx
import { Button } from "@sundayhug/ui";

export function CustomStyledButton() {
  return (
    <Button
      className="bg-gradient-to-r from-purple-500 to-pink-500"
      onClick={() => alert("Hello!")}
    >
      Gradient Button
    </Button>
  );
}
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **class-variance-authority** - Variant management
- **Lucide React** - Icon library

## Contributing

When adding or modifying components:

1. Ensure components are accessible (use Radix UI primitives when possible)
2. Follow the existing variant patterns using `class-variance-authority`
3. Export components from `src/index.ts`
4. Add TypeScript types for all props
5. Support dark mode styling
6. Update this README with new components

## Support

For questions or issues, please refer to:
- [Complete Component Catalog](./COMPONENTS.md) - Full API reference for all 24 exports
- [Usage Guide](./USAGE_GUIDE.md) - Setup, theming, and best practices
- [Real-World Examples](./docs/examples.md) - Production-ready composition patterns
- [Individual Component Docs](./docs/) - Detailed documentation for priority components
- Internal SundayHug development wiki

---

**License:** Private - SundayHug Internal Use Only
