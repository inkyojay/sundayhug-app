# Input

A styled input component that wraps the native HTML input element with consistent styling, focus states, and validation feedback.

## Import

```tsx
import { Input } from "@sundayhug/ui/components/input";
```

## Overview

The Input component provides a consistent, accessible text input interface with built-in focus states, validation styling, and support for all native input types. It includes special styling for file inputs and automatically handles disabled and invalid states.

## Props

The Input component accepts all standard HTML input attributes:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `"text"` | Input type (text, email, password, number, file, etc.) |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disables the input |
| `aria-invalid` | `boolean` | `false` | Marks input as invalid (triggers error styling) |
| `placeholder` | `string` | - | Placeholder text |
| ...props | - | - | All other native input attributes |

## Input Types

The Input component supports all native HTML input types with appropriate styling.

### Text

Standard text input for general text entry.

```tsx
<Input type="text" placeholder="Enter your name" />
```

### Email

Email input with browser validation.

```tsx
<Input type="email" placeholder="you@example.com" />
```

### Password

Password input with masked characters.

```tsx
<Input type="password" placeholder="Enter password" />
```

### Number

Numeric input with increment/decrement controls.

```tsx
<Input type="number" placeholder="Enter amount" min={0} max={100} />
```

### Search

Search input with browser-specific styling.

```tsx
<Input type="search" placeholder="Search..." />
```

### Tel

Telephone number input.

```tsx
<Input type="tel" placeholder="(555) 555-5555" />
```

### URL

URL input with browser validation.

```tsx
<Input type="url" placeholder="https://example.com" />
```

### Date, Time, DateTime

Date and time picker inputs.

```tsx
<Input type="date" />
<Input type="time" />
<Input type="datetime-local" />
```

### File

File upload input with custom styled file selector button.

```tsx
<Input type="file" />
<Input type="file" multiple accept="image/*" />
```

**File Input Styling:**
- File selector button styled to match overall design system
- Button height: 28px (h-7)
- Foreground text color
- Small font size (text-sm)
- Medium font weight

## States

### Default

Standard input appearance with transparent background and border.

```tsx
<Input placeholder="Default state" />
```

**Styling:**
- Height: 36px (h-9)
- Border with input color
- Transparent background (bg-transparent)
- Dark mode: 30% input background opacity
- Subtle shadow (shadow-xs)
- Base text size on desktop, small on mobile (md:text-sm)

### Focused

Enhanced visual feedback when input has focus.

```tsx
<Input placeholder="Click to see focus state" />
```

**Styling:**
- Border color changes to ring color
- 3px focus ring with 50% opacity
- Ring color matches theme
- Smooth transition on focus
- Outline: none (custom focus styling)

### Disabled

Non-interactive state for disabled inputs.

```tsx
<Input disabled placeholder="Disabled input" />
```

**Styling:**
- Pointer events disabled
- Cursor set to not-allowed
- 50% opacity
- No hover or focus effects

### Invalid (Error)

Error state triggered by `aria-invalid` attribute.

```tsx
<Input aria-invalid placeholder="Invalid input" />
```

**Styling:**
- Border color changes to destructive (red)
- Destructive focus ring (20% opacity light, 40% opacity dark)
- Ring color matches destructive theme
- Clear visual indication of validation error

## Usage Examples

### Example 1: Simple Form Field

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function SimpleForm() {
  return (
    <div className="space-y-2">
      <label htmlFor="name" className="text-sm font-medium">
        Name
      </label>
      <Input id="name" placeholder="Enter your name" />
    </div>
  );
}
```

### Example 2: Input with Label and Helper Text

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function FormFieldWithHelp() {
  return (
    <div className="space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
      />
      <p className="text-sm text-muted-foreground">
        We'll never share your email with anyone else.
      </p>
    </div>
  );
}
```

### Example 3: Input with Error Message

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function FormFieldWithError() {
  const [error, setError] = React.useState(true);

  return (
    <div className="space-y-2">
      <label htmlFor="username" className="text-sm font-medium">
        Username
      </label>
      <Input
        id="username"
        aria-invalid={error}
        placeholder="Enter username"
      />
      {error && (
        <p className="text-sm text-destructive">
          Username must be at least 3 characters.
        </p>
      )}
    </div>
  );
}
```

### Example 4: Controlled Input with Validation

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function EmailInput() {
  const [email, setEmail] = React.useState("");
  const [isValid, setIsValid] = React.useState(true);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(value === "" || validateEmail(value));
  };

  return (
    <div className="space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email Address
      </label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={handleChange}
        aria-invalid={!isValid}
        placeholder="you@example.com"
      />
      {!isValid && (
        <p className="text-sm text-destructive">
          Please enter a valid email address.
        </p>
      )}
    </div>
  );
}
```

### Example 5: Password Input with Toggle Visibility

```tsx
import { Input } from "@sundayhug/ui/components/input";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@sundayhug/ui/components/button";

export function PasswordInput() {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
```

### Example 6: File Upload with Preview

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function FileUpload() {
  const [fileName, setFileName] = React.useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="file" className="text-sm font-medium">
        Upload File
      </label>
      <Input
        id="file"
        type="file"
        onChange={handleFileChange}
        accept="image/*"
      />
      {fileName && (
        <p className="text-sm text-muted-foreground">
          Selected: {fileName}
        </p>
      )}
    </div>
  );
}
```

### Example 7: Search Input with Icon

```tsx
import { Input } from "@sundayhug/ui/components/input";
import { Search } from "lucide-react";

export function SearchInput() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        className="pl-10"
      />
    </div>
  );
}
```

### Example 8: Form with Multiple Inputs

```tsx
import { Input } from "@sundayhug/ui/components/input";
import { Button } from "@sundayhug/ui/components/button";

export function RegistrationForm() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 555-5555"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter password"
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Create Account
      </Button>
    </form>
  );
}
```

## Accessibility

The Input component includes several accessibility features:

- **Focus Visible**: Clear 3px focus ring with ring color for keyboard navigation
- **Disabled State**: Properly disables pointer events, sets cursor to not-allowed, and reduces opacity
- **ARIA Invalid**: When `aria-invalid` is set to true, applies destructive border and ring styling
- **Data Attribute**: Includes `data-slot="input"` for easy targeting in tests and styling
- **Label Association**: Works seamlessly with label elements using `htmlFor` and `id` attributes

### Accessibility Best Practices

1. **Always use labels**: Every input should have an associated label for screen readers
2. **Descriptive placeholders**: Use placeholders as hints, not as replacements for labels
3. **Error messages**: Associate error messages with inputs using `aria-describedby`
4. **Required fields**: Use the `required` attribute and indicate required fields visually
5. **Validation feedback**: Use `aria-invalid` to mark invalid inputs and provide clear error messages

### Enhanced Accessibility Example

```tsx
import { Input } from "@sundayhug/ui/components/input";

export function AccessibleInput() {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState("");
  const inputId = "username";
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Username <span className="text-destructive">*</span>
      </label>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-required="true"
        required
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

## Styling Details

### Text Selection

Selected text is styled with theme colors:
- Selection background: primary color
- Selection text: primary foreground color

### Placeholder

Placeholder text uses muted foreground color for subtle appearance.

### Focus States

All inputs include focus-visible styling:
- 3px ring with ring color at 50% opacity
- Border color changes to ring color
- Smooth transition on focus
- Outline removed (custom focus styling replaces it)

### Invalid States

When `aria-invalid` is true:
- Border color changes to destructive (red)
- Focus ring uses destructive color
- Light mode: 20% opacity destructive ring
- Dark mode: 40% opacity destructive ring

### Dark Mode

Dark mode variations are automatically handled:
- Background uses 30% input color opacity
- Input border adapts to dark theme
- Focus and invalid states adjust opacity for better contrast

### File Input

File inputs have special styling for the file selector button:
- Inline-flex display
- Height: 28px (h-7)
- Transparent border and background
- Foreground text color
- Small font size (text-sm)
- Medium font weight

### Transitions

Smooth transitions for interactive states:
- `transition-[color,box-shadow]` for focused transitions
- Applies to color and box-shadow properties only
- Maintains performance while providing smooth feedback

## Notes

- The component uses the `cn` utility for className merging
- All styles are Tailwind CSS classes
- Focus states follow WCAG 2.1 Level AA guidelines
- Minimum width set to 0 (min-w-0) to prevent flex container overflow issues
- Shadow-xs provides subtle depth without being distracting
- Base text size (text-base) on mobile, small (text-sm) on desktop for better readability
