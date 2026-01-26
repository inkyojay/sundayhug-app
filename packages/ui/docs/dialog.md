# Dialog

A modal dialog component built with Radix UI Dialog primitive for creating accessible modal windows, alert dialogs, and confirmations.

## Import

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@sundayhug/ui/components/dialog";
```

## Overview

The Dialog component provides a complete, accessible modal dialog system with proper focus management, keyboard navigation, and screen reader support. It includes a backdrop overlay, animated transitions, and a composable API for building various types of dialogs including modals, alerts, and confirmations.

## Architecture

The Dialog is composed of multiple subcomponents that work together:

- **Dialog**: Root component that manages dialog state
- **DialogTrigger**: Button or element that opens the dialog
- **DialogPortal**: Portal component for rendering outside DOM hierarchy
- **DialogOverlay**: Semi-transparent backdrop
- **DialogContent**: Main content container with close button
- **DialogHeader**: Header section for title and description
- **DialogFooter**: Footer section for actions
- **DialogTitle**: Accessible dialog title (required for a11y)
- **DialogDescription**: Optional description text
- **DialogClose**: Close button or element

## Subcomponents

### Dialog (Root)

The root component that manages the dialog's open/closed state.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Uncontrolled default open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `modal` | `boolean` | `true` | Whether dialog is modal (blocks interaction with rest of page) |

```tsx
// Uncontrolled
<Dialog>
  {/* Dialog content */}
</Dialog>

// Controlled
const [open, setOpen] = React.useState(false);
<Dialog open={open} onOpenChange={setOpen}>
  {/* Dialog content */}
</Dialog>
```

### DialogTrigger

The element that opens the dialog when clicked.

**Props:**

Accepts all props from `Radix.DialogTrigger` and standard button attributes.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Render as child element instead of button |
| `className` | `string` | - | Additional CSS classes |

```tsx
<DialogTrigger>Open Dialog</DialogTrigger>

// With asChild for custom trigger
<DialogTrigger asChild>
  <Button variant="outline">Open Settings</Button>
</DialogTrigger>
```

### DialogPortal

Portal component that renders dialog content outside the normal DOM hierarchy (at document body).

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `container` | `HTMLElement` | `document.body` | Container element for portal |
| `forceMount` | `boolean` | - | Force mount for animation control |

**Note:** DialogPortal is automatically used within DialogContent, so you typically don't need to use it directly.

### DialogOverlay

Semi-transparent backdrop that appears behind the dialog.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

**Styling:**
- Black background at 50% opacity (`bg-black/50`)
- Covers entire viewport (`fixed inset-0`)
- High z-index (`z-50`)
- Fade-in/out animations
- Data states for animation control

**Note:** DialogOverlay is automatically included in DialogContent, so you typically don't need to use it directly.

### DialogContent

Main container for dialog content with built-in close button.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Dialog content |
| `onEscapeKeyDown` | `(event: KeyboardEvent) => void` | - | Handler for Escape key |
| `onPointerDownOutside` | `(event: PointerDownOutsideEvent) => void` | - | Handler for clicks outside dialog |
| `onInteractOutside` | `(event: Event) => void` | - | Handler for any interaction outside |

```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Dialog Title</DialogTitle>
    <DialogDescription>Dialog description text.</DialogDescription>
  </DialogHeader>
  {/* Content */}
</DialogContent>

// Prevent closing on outside click
<DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
  {/* Content */}
</DialogContent>
```

**Styling:**
- Centered in viewport (top/left 50% with translate)
- Maximum width: 512px on desktop (`sm:max-w-lg`)
- Responsive width: full width minus 2rem on mobile
- Background color from theme
- Rounded corners and border
- Shadow for depth
- Zoom and fade animations
- Built-in close button in top-right corner

### DialogHeader

Container for dialog title and description, styled for proper spacing.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<DialogHeader>
  <DialogTitle>Edit Profile</DialogTitle>
  <DialogDescription>
    Make changes to your profile information.
  </DialogDescription>
</DialogHeader>
```

**Styling:**
- Flex column layout with gap
- Center-aligned on mobile, left-aligned on desktop
- Appropriate spacing between title and description

### DialogFooter

Container for dialog actions (buttons), typically at the bottom.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button variant="outline">Cancel</Button>
  </DialogClose>
  <Button type="submit">Save Changes</Button>
</DialogFooter>
```

**Styling:**
- Column-reverse layout on mobile (primary action on top)
- Row layout on desktop with actions right-aligned
- Consistent spacing between buttons

### DialogTitle

Accessible title for the dialog. Required for proper accessibility.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<DialogTitle>Confirm Deletion</DialogTitle>
```

**Styling:**
- Large text size (`text-lg`)
- Semibold font weight
- Tight line-height for single-line titles

**Accessibility:** This component is announced to screen readers as the dialog's accessible name.

### DialogDescription

Optional description text that provides additional context.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

```tsx
<DialogDescription>
  This action cannot be undone. All data will be permanently deleted.
</DialogDescription>
```

**Styling:**
- Muted text color for secondary emphasis
- Small text size (`text-sm`)

**Accessibility:** This component is announced to screen readers as the dialog's accessible description.

### DialogClose

Button or element that closes the dialog when clicked.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Render as child element instead of button |
| `className` | `string` | - | Additional CSS classes |

```tsx
// Standalone close button
<DialogClose>Close</DialogClose>

// As child of Button component
<DialogClose asChild>
  <Button variant="outline">Cancel</Button>
</DialogClose>
```

**Note:** DialogContent includes a built-in close button (X icon) in the top-right corner, so you don't always need to add an explicit DialogClose.

## Usage Examples

### Example 1: Basic Modal Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";

export function BasicDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription>
            This is a basic dialog example with a title and description.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 2: Confirmation Dialog

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";

export function DeleteConfirmation({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Delete Account
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 3: Form Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";
import { Input } from "@sundayhug/ui/components/input";
import { Label } from "@sundayhug/ui/components/label";

export function EditProfileDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <DialogFooter>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 4: Controlled Dialog

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";

export function ControlledDialog() {
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    // Perform action
    console.log("Submitted!");
    // Close dialog programmatically
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled Dialog</DialogTitle>
            <DialogDescription>
              This dialog's state is controlled by React state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Example 5: Alert Dialog

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";
import { AlertTriangle } from "lucide-react";

export function AlertDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Show Alert</Button>
      </DialogTrigger>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-yellow-500" />
            <DialogTitle>Warning</DialogTitle>
          </div>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to leave?
            All unsaved changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Stay</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive">Leave Anyway</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 6: Non-Modal Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";

export function NonModalDialog() {
  return (
    <Dialog modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline">Open Non-Modal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Non-Modal Dialog</DialogTitle>
          <DialogDescription>
            You can still interact with content behind this dialog.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 7: Async Confirmation

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sundayhug/ui/components/dialog";
import { Button } from "@sundayhug/ui/components/button";
import { Loader2 } from "lucide-react";

export function AsyncConfirmation({ onDelete }: { onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onDelete();
      setOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This will permanently delete the item. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="animate-spin" />}
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Accessibility

The Dialog component is built on Radix UI Dialog and includes comprehensive accessibility features:

### Keyboard Navigation

- **Escape**: Closes the dialog (can be prevented with `onEscapeKeyDown`)
- **Tab**: Cycles through focusable elements within the dialog
- **Shift + Tab**: Cycles backwards through focusable elements

### Focus Management

- **Auto Focus**: Automatically focuses the first focusable element when opened
- **Focus Trap**: Keeps focus within the dialog while open
- **Return Focus**: Returns focus to the trigger element when closed

### Screen Reader Support

- **Role**: Automatically set to `dialog` or `alertdialog`
- **aria-labelledby**: DialogTitle provides the accessible name (required)
- **aria-describedby**: DialogDescription provides additional context
- **aria-modal**: Indicates modal state to assistive technologies
- **Focus announcements**: Opening and closing is announced to screen readers

### Best Practices

1. **Always include DialogTitle**: Required for screen reader accessibility
2. **Use DialogDescription**: Provides important context for screen readers
3. **Logical focus order**: Structure content so Tab order makes sense
4. **Clear actions**: Use descriptive button labels ("Delete Account" not "OK")
5. **Prevent accidental closure**: For destructive actions, consider preventing outside clicks:
   ```tsx
   <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
   ```

## Animation Details

The Dialog includes smooth animations powered by Tailwind CSS:

### Overlay Animations

- **Fade In**: Opacity 0 → 100% when opening
- **Fade Out**: Opacity 100% → 0 when closing
- **Duration**: 200ms

### Content Animations

- **Opening**:
  - Fade in (opacity 0 → 100%)
  - Zoom in (scale 95% → 100%)
- **Closing**:
  - Fade out (opacity 100% → 0)
  - Zoom out (scale 100% → 95%)
- **Duration**: 200ms

### Animation States

Animations are controlled via `data-state` attribute:
- `data-state="open"`: Applied when opening
- `data-state="closed"`: Applied when closing

## Styling Customization

### Custom Width

```tsx
<DialogContent className="sm:max-w-md">
  {/* Smaller dialog */}
</DialogContent>

<DialogContent className="sm:max-w-4xl">
  {/* Larger dialog */}
</DialogContent>
```

### Full-Screen on Mobile

```tsx
<DialogContent className="max-w-full h-full rounded-none sm:max-w-lg sm:h-auto sm:rounded-lg">
  {/* Full-screen on mobile, normal on desktop */}
</DialogContent>
```

### Custom Overlay

If you need direct access to the overlay:

```tsx
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@sundayhug/ui/components/dialog";

<Dialog>
  <DialogPortal>
    <DialogOverlay className="bg-black/80" />
    {/* Rest of content */}
  </DialogPortal>
</Dialog>
```

### Scrollable Content

For long content, the dialog automatically becomes scrollable:

```tsx
<DialogContent className="max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>Long Content</DialogTitle>
  </DialogHeader>
  <div className="space-y-4">
    {/* Long content here */}
  </div>
</DialogContent>
```

## Data Attributes

All Dialog components include data attributes for testing and styling:

- `data-slot="dialog"`: Dialog root
- `data-slot="dialog-trigger"`: DialogTrigger
- `data-slot="dialog-portal"`: DialogPortal
- `data-slot="dialog-overlay"`: DialogOverlay
- `data-slot="dialog-content"`: DialogContent
- `data-slot="dialog-header"`: DialogHeader
- `data-slot="dialog-footer"`: DialogFooter
- `data-slot="dialog-title"`: DialogTitle
- `data-slot="dialog-description"`: DialogDescription
- `data-slot="dialog-close"`: DialogClose

These can be used for testing selectors:

```tsx
// In tests
const dialog = screen.getByTestId('[data-slot="dialog-content"]');
```

## Common Patterns

### Preventing Accidental Closure

For important actions like deletions:

```tsx
<DialogContent
  onPointerDownOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
>
  {/* Content */}
</DialogContent>
```

### Nested Dialogs

While not recommended for UX, you can nest dialogs:

```tsx
<Dialog>
  <DialogContent>
    {/* First dialog */}
    <Dialog>
      <DialogContent>
        {/* Second dialog */}
      </DialogContent>
    </Dialog>
  </DialogContent>
</Dialog>
```

### Custom Close Button

Replace the default close button:

```tsx
// Hide default close button with CSS
<DialogContent className="[&>button]:hidden">
  <DialogHeader>
    <DialogTitle>Custom Close</DialogTitle>
  </DialogHeader>
  <DialogClose asChild>
    <Button variant="ghost" className="absolute top-2 right-2">
      Custom Close
    </Button>
  </DialogClose>
</DialogContent>
```

## Notes

- Built on Radix UI Dialog primitive for robust accessibility
- Uses Tailwind CSS for all styling
- Portal rendering ensures proper z-index stacking
- Includes built-in close button with X icon from lucide-react
- All animations respect `prefers-reduced-motion`
- Modal by default (blocks interaction with rest of page)
- Proper TypeScript types inherited from Radix UI
- Focus management is automatic and follows WCAG 2.1 guidelines
