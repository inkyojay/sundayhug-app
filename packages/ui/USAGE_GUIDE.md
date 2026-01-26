# @sundayhug/ui Usage Guide

This guide covers installation, setup, theming, and best practices for using the `@sundayhug/ui` component library.

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Theming](#theming)
- [className Customization with cn()](#classname-customization-with-cn)
- [asChild Polymorphism Pattern](#aschild-polymorphism-pattern)
- [Accessibility](#accessibility)
- [Best Practices](#best-practices)

## Installation

### In a Monorepo (Recommended)

This package is designed to be used within a monorepo structure. Add it as a dependency in your app's `package.json`:

```json
{
  "dependencies": {
    "@sundayhug/ui": "workspace:*"
  }
}
```

### Peer Dependencies

Ensure you have the required peer dependencies installed:

```bash
npm install react@^19.0.0 react-dom@^19.0.0
```

## Setup

### 1. Import Styles

Import the component styles in your application's root layout or entry point:

```tsx
import "@sundayhug/ui/styles.css";
```

### 2. Configure Tailwind CSS

The components use Tailwind CSS for styling. Ensure your `tailwind.config.js` is properly configured:

```js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@sundayhug/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // ... other theme colors
      },
    },
  },
};
```

### 3. Import Components

Components can be imported in two ways:

```tsx
// Named imports from the main entry
import { Button, Input, Dialog } from "@sundayhug/ui";

// Direct component imports (tree-shaking friendly)
import { Button } from "@sundayhug/ui/components/button";
```

## Theming

### CSS Variables

The component library uses CSS custom properties (CSS variables) for theming. Define these variables in your global CSS:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### Dark Mode

Dark mode is supported via CSS class toggling. Add the `dark` class to your root element:

```tsx
<html className="dark">
  {/* Your app */}
</html>
```

Or implement a theme toggle:

```tsx
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <Button onClick={() => setIsDark(!isDark)}>
      Toggle Theme
    </Button>
  );
}
```

## className Customization with cn()

### What is cn()?

The `cn()` utility function combines `clsx` and `tailwind-merge` to intelligently merge Tailwind CSS classes:

```tsx
import { cn } from "@sundayhug/ui";

// Merges classes and resolves conflicts
cn("px-4 py-2", "px-8") // Result: "py-2 px-8"

// Handles conditional classes
cn("base-class", condition && "conditional-class")

// Combines multiple sources
cn(baseStyles, variants[variant], className)
```

### Usage in Components

All components accept a `className` prop that is merged with internal classes using `cn()`:

```tsx
<Button className="mt-4 w-full">
  Submit
</Button>

// The cn() function ensures your custom classes override defaults properly
<Button variant="outline" className="border-blue-500 hover:bg-blue-50">
  Custom Border
</Button>
```

### Creating Custom Component Variants

Use `class-variance-authority` (CVA) with `cn()` for component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@sundayhug/ui";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
);

function CustomCard({ className, padding, ...props }) {
  return (
    <div className={cn(cardVariants({ padding }), className)} {...props} />
  );
}
```

## asChild Polymorphism Pattern

### What is asChild?

The `asChild` pattern allows components to merge their props with a child element, enabling polymorphic behavior while maintaining styling and functionality.

### How It Works

Components supporting `asChild` use Radix UI's `Slot` component:

```tsx
import { Slot } from "@radix-ui/react-slot";

function Button({ asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}
```

### Common Use Cases

#### 1. Rendering as a Link

```tsx
import { Button } from "@sundayhug/ui";
import { Link } from "react-router-dom";

// Button renders as a Link while maintaining button styles
<Button asChild>
  <Link to="/dashboard">Go to Dashboard</Link>
</Button>
```

#### 2. Rendering as Next.js Link

```tsx
import { Button } from "@sundayhug/ui";
import Link from "next/link";

<Button asChild>
  <Link href="/profile">View Profile</Link>
</Button>
```

#### 3. Custom Element Types

```tsx
// Render as a label
<Button asChild>
  <label htmlFor="file-input">
    Upload File
  </label>
</Button>

// Render as any custom component
<Button asChild>
  <CustomRouterLink path="/home" />
</Button>
```

### When to Use asChild

- ✅ When you need a component's styling but different semantic HTML
- ✅ When integrating with routing libraries
- ✅ When building accessible custom interactions
- ❌ Don't use when you need the default element's behavior

### Supported Components

The following components support the `asChild` pattern:

- `Button`
- `Badge`
- `Alert`
- (Check component documentation for full list)

## Accessibility

### Built-in Accessibility Features

All components are built with accessibility in mind:

#### 1. Keyboard Navigation

- Components support standard keyboard interactions
- Focus management follows WAI-ARIA patterns
- Tab order is logical and predictable

```tsx
// Focus styles are automatically applied
<Button>
  {/* Has focus-visible:ring for keyboard focus indication */}
  Accessible Button
</Button>
```

#### 2. ARIA Attributes

Components include appropriate ARIA attributes:

```tsx
// Buttons automatically support aria-invalid
<Button aria-invalid={hasError}>
  Submit
</Button>

// Form fields include proper labeling
<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" aria-describedby="email-error" />
  <p id="email-error">Error message</p>
</div>
```

#### 3. Screen Reader Support

- Semantic HTML elements are used where appropriate
- Hidden content uses `sr-only` utility classes
- State changes are announced properly

```tsx
<Button>
  <span className="sr-only">Loading</span>
  <LoadingSpinner aria-hidden="true" />
</Button>
```

### Accessibility Best Practices

#### Always Provide Labels

```tsx
// ✅ Good
<div>
  <Label htmlFor="username">Username</Label>
  <Input id="username" />
</div>

// ❌ Bad
<Input placeholder="Username" /> // Placeholder is not a label
```

#### Use Proper Semantic Elements

```tsx
// ✅ Good - Use Button for actions
<Button onClick={handleSubmit}>Submit</Button>

// ❌ Bad - Avoid div/span as buttons
<div onClick={handleSubmit}>Submit</div>
```

#### Manage Focus States

```tsx
// Dialog components handle focus automatically
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Focus is trapped and returns to trigger on close */}
  </DialogContent>
</Dialog>
```

#### Provide Error Feedback

```tsx
<div>
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={!!error}
    aria-describedby={error ? "password-error" : undefined}
  />
  {error && (
    <p id="password-error" className="text-destructive text-sm">
      {error}
    </p>
  )}
</div>
```

## Best Practices

### Component Composition

Build complex UIs by composing simple components:

```tsx
function UserCard({ user }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link to={`/users/${user.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Consistent Variant Usage

Maintain visual consistency by using standard variants:

```tsx
// Primary actions
<Button variant="default">Save</Button>

// Secondary actions
<Button variant="outline">Cancel</Button>

// Destructive actions
<Button variant="destructive">Delete</Button>

// Tertiary actions
<Button variant="ghost">Skip</Button>
```

### Form Patterns

Structure forms consistently:

```tsx
function LoginForm() {
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </div>
    </form>
  );
}
```

### Performance Optimization

#### Use Direct Imports for Tree-Shaking

```tsx
// ✅ Better - imports only what you need
import { Button } from "@sundayhug/ui/components/button";
import { Input } from "@sundayhug/ui/components/input";

// ✅ Also fine - modern bundlers handle this
import { Button, Input } from "@sundayhug/ui";
```

#### Lazy Load Heavy Components

```tsx
import { lazy, Suspense } from "react";

const Dialog = lazy(() =>
  import("@sundayhug/ui/components/dialog").then(mod => ({
    default: mod.Dialog
  }))
);

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Dialog>{/* ... */}</Dialog>
    </Suspense>
  );
}
```

### TypeScript Tips

#### Extend Component Props

```tsx
import { type ComponentProps } from "react";
import { Button } from "@sundayhug/ui";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  isSubmitting?: boolean;
}

function SubmitButton({ isSubmitting, children, ...props }: SubmitButtonProps) {
  return (
    <Button disabled={isSubmitting} {...props}>
      {isSubmitting ? "Submitting..." : children}
    </Button>
  );
}
```

#### Use Variant Types

```tsx
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@sundayhug/ui";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

function getButtonVariant(type: "primary" | "secondary"): ButtonVariant {
  return type === "primary" ? "default" : "outline";
}
```

### Testing

#### Component Testing

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@sundayhug/ui";

test("renders button with text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
});
```

#### Accessibility Testing

```tsx
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "@sundayhug/ui";

test("button has no accessibility violations", async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Additional Resources

- **Component API Documentation**: See `COMPONENT_API.md` for detailed prop references
- **Migration Guide**: See `MIGRATION_GUIDE.md` for upgrading between versions
- **Radix UI Documentation**: https://www.radix-ui.com/
- **Tailwind CSS Documentation**: https://tailwindcss.com/

## Support

For issues or questions:
- Check the component API documentation
- Review examples in the `/examples` directory
- Open an issue in the project repository
