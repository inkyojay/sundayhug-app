# Button

A versatile button component built with Radix UI Slot and class-variance-authority for flexible styling and composition.

## Import

```tsx
import { Button } from "@sundayhug/ui/components/button";
```

## Overview

The Button component provides a consistent, accessible button interface with multiple visual variants, sizes, and composition support through the `asChild` prop. It includes built-in focus states, disabled states, and aria-invalid styling.

## Props

The Button component accepts all standard HTML button attributes plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style variant |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Size of the button |
| `asChild` | `boolean` | `false` | Render as child element (composition pattern) |
| `className` | `string` | - | Additional CSS classes |

## Variants

### Default

The primary button style with solid background and shadow.

```tsx
<Button variant="default">Default Button</Button>
```

**Styling:**
- Primary background color with primary foreground text
- Shadow for depth
- Hover state with 90% opacity
- Focus ring with primary color

### Destructive

For dangerous or irreversible actions like deletions.

```tsx
<Button variant="destructive">Delete Account</Button>
```

**Styling:**
- Destructive (red) background with white text
- Shadow for emphasis
- Special focus ring in destructive color (20% opacity light, 40% opacity dark)
- Reduced opacity in dark mode (60%)

### Outline

A subtle button with border, ideal for secondary actions.

```tsx
<Button variant="outline">Cancel</Button>
```

**Styling:**
- Border with background color
- Hover transitions to accent background
- Different styling in dark mode (input background)
- Shadow for subtle depth

### Secondary

Alternative solid button style for secondary actions.

```tsx
<Button variant="secondary">Learn More</Button>
```

**Styling:**
- Secondary background color
- Secondary foreground text
- Hover state at 80% opacity
- Shadow for depth

### Ghost

Minimal button style without background or border.

```tsx
<Button variant="ghost">Skip</Button>
```

**Styling:**
- No default background
- Hover shows accent background
- Reduced accent opacity in dark mode (50%)
- No shadow

### Link

Styled as an underlined link rather than a button.

```tsx
<Button variant="link">View Details</Button>
```

**Styling:**
- Primary text color
- Underline on hover
- No background or border
- No shadow

## Sizes

### Default

Standard button height and padding.

```tsx
<Button size="default">Default Size</Button>
```

**Dimensions:**
- Height: 36px (h-9)
- Padding: 16px horizontal (px-4)
- Icon variant: 12px horizontal padding (px-3)

### Small (sm)

Compact button for tight spaces.

```tsx
<Button size="sm">Small Button</Button>
```

**Dimensions:**
- Height: 32px (h-8)
- Padding: 12px horizontal (px-3)
- Gap: 6px (gap-1.5)
- Icon variant: 10px horizontal padding (px-2.5)

### Large (lg)

Larger button for prominent actions.

```tsx
<Button size="lg">Large Button</Button>
```

**Dimensions:**
- Height: 40px (h-10)
- Padding: 24px horizontal (px-6)
- Icon variant: 16px horizontal padding (px-4)

### Icon

Square button optimized for icon-only content.

```tsx
<Button size="icon">
  <IconComponent />
</Button>
```

**Dimensions:**
- Square: 36px × 36px (size-9)
- No padding (icon is centered)

## The asChild Prop

The `asChild` prop enables composition by allowing the Button to render as a different element while preserving Button styling. This is powered by Radix UI's Slot component.

### Use Case: Link as Button

Render a Next.js Link with button styling:

```tsx
import Link from "next/link";
import { Button } from "@sundayhug/ui/components/button";

<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

### Use Case: Custom Element

Render any custom element with button styling:

```tsx
<Button asChild>
  <a href="https://example.com" target="_blank" rel="noopener">
    External Link
  </a>
</Button>
```

## Usage Examples

### Example 1: Form Actions

```tsx
import { Button } from "@sundayhug/ui/components/button";

export function LoginForm() {
  return (
    <form>
      {/* Form fields */}
      <div className="flex gap-2">
        <Button type="submit" variant="default">
          Sign In
        </Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

### Example 2: Icon Button with Tooltip

```tsx
import { Button } from "@sundayhug/ui/components/button";
import { Settings } from "lucide-react";

export function SettingsButton() {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Open settings"
    >
      <Settings />
    </Button>
  );
}
```

### Example 3: Delete Confirmation Dialog

```tsx
import { Button } from "@sundayhug/ui/components/button";
import { Trash2 } from "lucide-react";

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 />
        Delete Item
      </Button>

      {/* Dialog would be rendered here */}
    </>
  );
}
```

### Example 4: Loading State

```tsx
import { Button } from "@sundayhug/ui/components/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button disabled={isLoading}>
      {isLoading && <Loader2 className="animate-spin" />}
      {isLoading ? "Saving..." : "Save Changes"}
    </Button>
  );
}
```

### Example 5: Navigation with Next.js Link

```tsx
import Link from "next/link";
import { Button } from "@sundayhug/ui/components/button";
import { ArrowRight } from "lucide-react";

export function CTAButton() {
  return (
    <Button asChild size="lg">
      <Link href="/get-started">
        Get Started
        <ArrowRight />
      </Link>
    </Button>
  );
}
```

### Example 6: Button Group

```tsx
import { Button } from "@sundayhug/ui/components/button";
import { Bold, Italic, Underline } from "lucide-react";

export function TextFormatting() {
  return (
    <div className="inline-flex gap-1">
      <Button size="icon" variant="outline">
        <Bold />
      </Button>
      <Button size="icon" variant="outline">
        <Italic />
      </Button>
      <Button size="icon" variant="outline">
        <Underline />
      </Button>
    </div>
  );
}
```

## Accessibility

The Button component includes several accessibility features:

- **Focus Visible**: Clear focus ring (3px) with appropriate color for keyboard navigation
- **Disabled State**: Properly disables pointer events and reduces opacity
- **ARIA Invalid**: Special styling when `aria-invalid` is set, with destructive color ring
- **Data Attribute**: Includes `data-slot="button"` for easy targeting in tests and styling

### Accessibility Best Practices

1. **Use descriptive text**: Ensure button labels clearly describe the action
2. **Icon-only buttons**: Always include `aria-label` for icon-only buttons
3. **Loading states**: Communicate loading states with both visual and text indicators
4. **Keyboard navigation**: All interactive states are keyboard accessible

## SVG Icon Handling

The Button component includes automatic SVG icon styling:

- Icons are automatically sized to 16px (size-4) unless a specific size class is provided
- Icons don't capture pointer events
- Icons shrink appropriately to prevent layout issues
- Gap spacing automatically adjusts between icon and text

```tsx
import { Button } from "@sundayhug/ui/components/button";
import { Download } from "lucide-react";

// Icon automatically sized and spaced
<Button>
  <Download />
  Download File
</Button>

// Custom icon size
<Button>
  <Download className="size-5" />
  Download File
</Button>
```

## Styling Details

### Focus States

All buttons include focus-visible styling:
- 3px ring in the appropriate color (ring or destructive)
- 50% opacity ring color
- Border color changes to ring color
- Respects `prefers-reduced-motion`

### Dark Mode

Dark mode variations are automatically handled:
- Outline variant uses input background
- Ghost variant reduces hover background opacity
- Destructive variant uses 60% background opacity
- Focus rings adjust opacity (40% vs 20%)

### Transitions

All interactive states include smooth transitions:
- `transition-all` for comprehensive state changes
- Hover states
- Focus states
- Disabled states

## Notes

- The component uses `class-variance-authority` for variant management
- Radix UI Slot enables composition patterns
- All styles are Tailwind CSS classes
- Focus states follow WCAG 2.1 Level AA guidelines
