# Select

A dropdown select component built with Radix UI Select primitive for creating accessible, searchable dropdown menus with single-value selection.

## Import

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@sundayhug/ui/components/select";
```

## Overview

The Select component provides a complete, accessible dropdown select system with proper keyboard navigation, screen reader support, and visual feedback. It supports grouped options, custom styling, and both controlled and uncontrolled value handling.

## Architecture

The Select is composed of multiple subcomponents that work together:

- **Select**: Root component that manages select state and value
- **SelectTrigger**: Button that opens the dropdown menu
- **SelectValue**: Displays the currently selected value
- **SelectContent**: Dropdown container with scrollable list
- **SelectItem**: Individual selectable option
- **SelectGroup**: Container for grouping related options
- **SelectLabel**: Label for option groups
- **SelectSeparator**: Visual separator between options or groups
- **SelectScrollUpButton**: Button to scroll up (auto-shown when needed)
- **SelectScrollDownButton**: Button to scroll down (auto-shown when needed)

## Subcomponents

### Select (Root)

The root component that manages the select's value and open/closed state.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Controlled value |
| `defaultValue` | `string` | - | Uncontrolled default value |
| `onValueChange` | `(value: string) => void` | - | Callback when value changes |
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Uncontrolled default open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `disabled` | `boolean` | `false` | Whether select is disabled |
| `name` | `string` | - | Name for form submission |
| `required` | `boolean` | `false` | Whether select is required |

```tsx
// Uncontrolled
<Select defaultValue="apple">
  {/* Select content */}
</Select>

// Controlled
const [value, setValue] = React.useState("apple");
<Select value={value} onValueChange={setValue}>
  {/* Select content */}
</Select>
```

### SelectTrigger

The button element that displays the selected value and opens the dropdown.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default"` | `"default"` | Size of the trigger button |
| `className` | `string` | - | Additional CSS classes |
| `aria-label` | `string` | - | Accessible label for screen readers |
| `aria-invalid` | `boolean` | - | Whether field has validation error |

```tsx
<SelectTrigger>
  <SelectValue placeholder="Select a fruit" />
</SelectTrigger>

// Small size
<SelectTrigger size="sm">
  <SelectValue placeholder="Select..." />
</SelectTrigger>

// With validation error
<SelectTrigger aria-invalid={hasError}>
  <SelectValue />
</SelectTrigger>
```

**Styling:**
- Default height: 36px (h-9)
- Small height: 32px (h-8)
- Automatic chevron icon on the right
- Border with focus ring on keyboard focus
- Error state with destructive color border/ring when `aria-invalid` is set
- Muted text color for placeholder
- Rounded corners and subtle shadow
- Different background in dark mode

### SelectValue

Displays the currently selected value or placeholder text.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | - | Text shown when no value is selected |
| `className` | `string` | - | Additional CSS classes |

```tsx
<SelectValue placeholder="Choose an option" />

// With custom styling
<SelectValue
  placeholder="Select..."
  className="text-sm italic"
/>
```

**Styling:**
- Automatically shows placeholder in muted color when no value selected
- Displays selected item's text content when value is set
- Supports icons in selected value (from SelectItem)
- Line-clamp-1 for overflow handling

### SelectContent

The dropdown menu container that appears when the select is opened.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"item-aligned" \| "popper"` | `"popper"` | Positioning strategy |
| `className` | `string` | - | Additional CSS classes |
| `sideOffset` | `number` | - | Distance from trigger |
| `align` | `"start" \| "center" \| "end"` | - | Horizontal alignment |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | - | Which side to position on |

```tsx
<SelectContent>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectContent>

// Custom positioning
<SelectContent position="item-aligned" align="start">
  {/* Items */}
</SelectContent>
```

**Styling:**
- Popover background with border
- Rounded corners and shadow
- Maximum height based on available viewport space
- Auto-scrollable when content overflows
- Fade and zoom animations on open/close
- Portal rendering for proper z-index stacking
- Automatic scroll buttons when needed

### SelectItem

Individual selectable option within the dropdown.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | **Required.** Unique value for this option |
| `disabled` | `boolean` | `false` | Whether option is disabled |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Display content (text, icons, etc.) |

```tsx
<SelectItem value="apple">Apple</SelectItem>

// With icon
<SelectItem value="settings">
  <Settings className="size-4" />
  Settings
</SelectItem>

// Disabled option
<SelectItem value="locked" disabled>
  Locked Feature
</SelectItem>
```

**Styling:**
- Accent background on hover/focus
- Check icon appears when selected (right side)
- Muted icon colors by default
- Disabled state with reduced opacity
- Automatic icon sizing (16px) and spacing
- Rounded corners for focus state
- Cursor indicates interactivity

### SelectGroup

Container for grouping related options with an optional label.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | SelectLabel and SelectItems |

```tsx
<SelectGroup>
  <SelectLabel>Fruits</SelectLabel>
  <SelectItem value="apple">Apple</SelectItem>
  <SelectItem value="banana">Banana</SelectItem>
</SelectGroup>
```

### SelectLabel

Label for a group of options. Not selectable.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<SelectLabel>Categories</SelectLabel>
```

**Styling:**
- Small text size (text-xs)
- Muted text color
- Padding for visual separation
- Cannot be selected or focused

### SelectSeparator

Visual separator line between options or groups.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<SelectItem value="option1">Option 1</SelectItem>
<SelectSeparator />
<SelectItem value="option2">Option 2</SelectItem>
```

**Styling:**
- Thin horizontal line (1px)
- Border color from theme
- Negative horizontal margin for full width
- Vertical margin for spacing
- Not interactive

### SelectScrollUpButton

Button that appears when content can scroll up. Automatically shown by SelectContent.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

**Note:** This component is automatically included in SelectContent and only appears when content is scrollable.

### SelectScrollDownButton

Button that appears when content can scroll down. Automatically shown by SelectContent.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

**Note:** This component is automatically included in SelectContent and only appears when content is scrollable.

## Usage Examples

### Example 1: Basic Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

export function BasicSelect() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Example 2: Grouped Options

```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

export function GroupedSelect() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a food" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="broccoli">Broccoli</SelectItem>
          <SelectItem value="spinach">Spinach</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
```

### Example 3: Controlled Select

```tsx
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

export function ControlledSelect() {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-4">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Select a color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="red">Red</SelectItem>
          <SelectItem value="blue">Blue</SelectItem>
          <SelectItem value="green">Green</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Selected: {value || "none"}
      </p>
    </div>
  );
}
```

### Example 4: With Icons

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";
import { Mail, Phone, MessageSquare } from "lucide-react";

export function IconSelect() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Contact method" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="email">
          <Mail />
          Email
        </SelectItem>
        <SelectItem value="phone">
          <Phone />
          Phone
        </SelectItem>
        <SelectItem value="chat">
          <MessageSquare />
          Chat
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Example 5: Form Integration

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";
import { Label } from "@sundayhug/ui/components/label";

export function FormSelect() {
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country) {
      setError("Please select a country");
      return;
    }
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select
          value={country}
          onValueChange={(value) => {
            setCountry(value);
            setError("");
          }}
          name="country"
          required
        >
          <SelectTrigger id="country" aria-invalid={!!error}>
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">United States</SelectItem>
            <SelectItem value="uk">United Kingdom</SelectItem>
            <SelectItem value="ca">Canada</SelectItem>
            <SelectItem value="au">Australia</SelectItem>
          </SelectContent>
        </Select>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Example 6: Small Size Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

export function SmallSelect() {
  return (
    <Select>
      <SelectTrigger size="sm">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
        <SelectItem value="2">Option 2</SelectItem>
        <SelectItem value="3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Example 7: With Disabled Options

```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

export function DisabledOptionsSelect() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Available Plans</SelectLabel>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Coming Soon</SelectLabel>
          <SelectItem value="enterprise" disabled>
            Enterprise (Coming Soon)
          </SelectItem>
          <SelectItem value="custom" disabled>
            Custom (Coming Soon)
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
```

### Example 8: Dynamic Options from API

```tsx
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sundayhug/ui/components/select";

interface User {
  id: string;
  name: string;
}

export function DynamicSelect() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users from API
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Select value={selectedUser} onValueChange={setSelectedUser}>
      <SelectTrigger>
        <SelectValue placeholder="Select a user" />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Value Handling

The Select component supports both controlled and uncontrolled usage patterns.

### Uncontrolled

Use `defaultValue` for uncontrolled select where React doesn't manage the state:

```tsx
<Select defaultValue="apple">
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectContent>
</Select>
```

### Controlled

Use `value` and `onValueChange` for full control over the select state:

```tsx
const [fruit, setFruit] = useState("apple");

<Select value={fruit} onValueChange={setFruit}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
  </SelectContent>
</Select>
```

### Form Integration

Use the `name` prop for form submission:

```tsx
<Select name="country" defaultValue="us">
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="us">United States</SelectItem>
    <SelectItem value="uk">United Kingdom</SelectItem>
  </SelectContent>
</Select>
```

The hidden input with the `name` attribute will be included in form submissions.

## Accessibility

The Select component is built on Radix UI Select and includes comprehensive accessibility features:

### Keyboard Navigation

- **Space/Enter**: Opens the select when trigger is focused
- **Arrow Down**: Opens select and moves to next option
- **Arrow Up**: Opens select and moves to previous option
- **Escape**: Closes the select
- **Tab**: Moves focus out of select (closes if open)
- **Home**: Moves to first option (when open)
- **End**: Moves to last option (when open)
- **Type-ahead**: Type to jump to options starting with typed characters

### Focus Management

- **Auto Focus**: Trigger can receive focus via keyboard navigation
- **Focus Visible**: Clear focus ring for keyboard users
- **Focus Trap**: Focus stays within select content when open
- **Return Focus**: Focus returns to trigger when closed

### Screen Reader Support

- **Role**: Automatically set to `combobox` with proper ARIA attributes
- **aria-expanded**: Indicates whether dropdown is open
- **aria-controls**: Links trigger to content
- **aria-activedescendant**: Announces currently focused option
- **aria-labelledby**: Links to associated label
- **aria-describedby**: Can link to error or help text
- **aria-invalid**: Indicates validation errors

### Best Practices

1. **Always provide a label**: Use Label component or `aria-label` on trigger
2. **Use clear option text**: Avoid ambiguous option labels
3. **Indicate required fields**: Use `required` prop and visual indicator
4. **Show validation errors**: Use `aria-invalid` and error messages
5. **Group related options**: Use SelectGroup for better organization
6. **Provide placeholder text**: Helps users understand what to select

```tsx
// Good accessibility example
<div className="space-y-2">
  <Label htmlFor="category">
    Category <span className="text-destructive">*</span>
  </Label>
  <Select name="category" required>
    <SelectTrigger id="category" aria-invalid={hasError}>
      <SelectValue placeholder="Select a category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="tech">Technology</SelectItem>
      <SelectItem value="health">Health</SelectItem>
    </SelectContent>
  </Select>
  {hasError && (
    <p className="text-sm text-destructive" role="alert">
      Please select a category
    </p>
  )}
</div>
```

## Animation Details

The Select includes smooth animations powered by Tailwind CSS:

### Content Animations

- **Opening**:
  - Fade in (opacity 0 → 100%)
  - Zoom in (scale 95% → 100%)
  - Slide from trigger direction (4px offset)
- **Closing**:
  - Fade out (opacity 100% → 0)
  - Zoom out (scale 100% → 95%)
- **Duration**: 200ms

### Position-Based Slides

The content slides from different directions based on position:
- Bottom placement: slides from top
- Top placement: slides from bottom
- Left placement: slides from right
- Right placement: slides from left

### Animation States

Animations are controlled via `data-state` attribute:
- `data-state="open"`: Applied when opening
- `data-state="closed"`: Applied when closing

## Styling Customization

### Custom Trigger Width

```tsx
<SelectTrigger className="w-full">
  <SelectValue placeholder="Select..." />
</SelectTrigger>

<SelectTrigger className="w-[200px]">
  <SelectValue placeholder="Select..." />
</SelectTrigger>
```

### Custom Content Width

```tsx
<SelectContent className="min-w-[300px]">
  {/* Items */}
</SelectContent>
```

### Custom Item Styling

```tsx
<SelectItem value="special" className="text-primary font-semibold">
  Special Option
</SelectItem>
```

### Removing Select Chevron Icon

```tsx
<SelectTrigger className="[&>svg]:hidden">
  <SelectValue placeholder="Select..." />
</SelectTrigger>
```

### Full Width Select

```tsx
<div className="w-full">
  <Select>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      {/* Items */}
    </SelectContent>
  </Select>
</div>
```

## Data Attributes

All Select components include data attributes for testing and styling:

- `data-slot="select"`: Select root
- `data-slot="select-trigger"`: SelectTrigger
- `data-slot="select-value"`: SelectValue
- `data-slot="select-content"`: SelectContent
- `data-slot="select-item"`: SelectItem
- `data-slot="select-group"`: SelectGroup
- `data-slot="select-label"`: SelectLabel
- `data-slot="select-separator"`: SelectSeparator
- `data-slot="select-scroll-up-button"`: SelectScrollUpButton
- `data-slot="select-scroll-down-button"`: SelectScrollDownButton

Additional data attributes for state:
- `data-state="open" | "closed"`: Current open state
- `data-size="sm" | "default"`: Trigger size variant
- `data-placeholder`: Present when showing placeholder
- `data-disabled`: Present when disabled

These can be used for testing selectors:

```tsx
// In tests
const trigger = screen.getByTestId('[data-slot="select-trigger"]');
const openSelect = screen.getByTestId('[data-state="open"]');
```

## Common Patterns

### Conditional Options

```tsx
<SelectContent>
  {isAdmin && <SelectItem value="admin">Admin Panel</SelectItem>}
  <SelectItem value="dashboard">Dashboard</SelectItem>
  <SelectItem value="settings">Settings</SelectItem>
</SelectContent>
```

### Search/Filter Integration

While Select doesn't have built-in search, you can filter options:

```tsx
const [search, setSearch] = useState("");
const filteredFruits = fruits.filter((fruit) =>
  fruit.toLowerCase().includes(search.toLowerCase())
);

// Note: Actual search input would require custom implementation
<SelectContent>
  {filteredFruits.map((fruit) => (
    <SelectItem key={fruit} value={fruit}>
      {fruit}
    </SelectItem>
  ))}
</SelectContent>
```

### Resetting Value

```tsx
const [value, setValue] = useState("");

<div className="flex gap-2">
  <Select value={value} onValueChange={setValue}>
    <SelectTrigger>
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="1">Option 1</SelectItem>
      <SelectItem value="2">Option 2</SelectItem>
    </SelectContent>
  </Select>
  <Button onClick={() => setValue("")} variant="outline">
    Clear
  </Button>
</div>
```

### Confirming Selection Changes

```tsx
const [value, setValue] = useState("original");
const [pendingValue, setPendingValue] = useState("");

const handleValueChange = (newValue: string) => {
  setPendingValue(newValue);
  // Show confirmation dialog
  if (confirm("Change selection?")) {
    setValue(newValue);
  }
};

<Select value={value} onValueChange={handleValueChange}>
  {/* Select content */}
</Select>
```

## Notes

- Built on Radix UI Select primitive for robust accessibility
- Uses Tailwind CSS for all styling
- Portal rendering ensures proper z-index stacking
- Supports single-value selection only (no multi-select)
- Automatic scroll buttons appear when content overflows
- Icons from lucide-react (CheckIcon, ChevronDownIcon, ChevronUpIcon)
- All animations respect `prefers-reduced-motion`
- TypeScript types inherited from Radix UI
- Proper focus management follows WCAG 2.1 guidelines
- Works with form submissions via hidden input
