# UI Components

Complete component catalog and API reference for the `@repo/ui` package.

## Table of Contents

- [Alert](#alert)
- [Avatar](#avatar)
- [Badge](#badge)
- [Button](#button)
- [Card](#card)
- [Checkbox](#checkbox)
- [Collapsible](#collapsible)
- [Dialog](#dialog)
- [Dropdown Menu](#dropdown-menu)
- [Input](#input)
- [Input OTP](#input-otp)
- [Label](#label)
- [Radio Group](#radio-group)
- [Select](#select)
- [Separator](#separator)
- [Sheet](#sheet)
- [Sidebar](#sidebar)
- [Skeleton](#skeleton)
- [Sonner](#sonner)
- [Table](#table)
- [Tabs](#tabs)
- [Textarea](#textarea)
- [Tooltip](#tooltip)

---

## Alert

Displays a callout for user attention.

### Components

- `Alert` - Container component
- `AlertTitle` - Title text
- `AlertDescription` - Description text

### Props

**Alert**
- `variant`: `"default" | "destructive"` - Visual style (default: `"default"`)
- Extends `React.ComponentProps<"div">`

**AlertTitle**
- Extends `React.ComponentProps<"div">`

**AlertDescription**
- Extends `React.ComponentProps<"div">`

### Usage

```tsx
import { Alert, AlertTitle, AlertDescription } from "@repo/ui";
import { InfoIcon } from "lucide-react";

<Alert>
  <InfoIcon />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

---

## Avatar

Displays a user profile picture with a fallback.

### Components

- `Avatar` - Container component
- `AvatarImage` - Image element
- `AvatarFallback` - Fallback content when image fails to load

### Props

**Avatar**
- Extends `React.ComponentProps<typeof AvatarPrimitive.Root>`

**AvatarImage**
- `src`: `string` - Image source URL
- `alt`: `string` - Alternative text
- Extends `React.ComponentProps<typeof AvatarPrimitive.Image>`

**AvatarFallback**
- Extends `React.ComponentProps<typeof AvatarPrimitive.Fallback>`

### Usage

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui";

<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

---

## Badge

Displays a small count or status indicator.

### Components

- `Badge` - Badge component

### Props

- `variant`: `"default" | "secondary" | "destructive" | "outline"` - Visual style (default: `"default"`)
- `asChild`: `boolean` - Use child as the rendered element (default: `false`)
- Extends `React.ComponentProps<"span">`

### Usage

```tsx
import { Badge } from "@repo/ui";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## Button

Triggers an action or event.

### Components

- `Button` - Button component

### Props

- `variant`: `"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"` - Visual style (default: `"default"`)
- `size`: `"default" | "sm" | "lg" | "icon"` - Button size (default: `"default"`)
- `asChild`: `boolean` - Use child as the rendered element (default: `false`)
- Extends `React.ComponentProps<"button">`

### Usage

```tsx
import { Button } from "@repo/ui";

<Button>Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

---

## Card

Displays content in a contained box.

### Components

- `Card` - Container component
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardAction` - Action area (top-right)
- `CardContent` - Main content area
- `CardFooter` - Footer section

### Props

All components extend `React.ComponentProps<"div">`

### Usage

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@repo/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon">...</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Checkbox

Allows users to select one or more items.

### Components

- `Checkbox` - Checkbox component

### Props

- `checked`: `boolean | "indeterminate"` - Checked state
- `onCheckedChange`: `(checked: boolean) => void` - Change handler
- `disabled`: `boolean` - Disabled state
- Extends `React.ComponentProps<typeof CheckboxPrimitive.Root>`

### Usage

```tsx
import { Checkbox } from "@repo/ui";
import { Label } from "@repo/ui";

<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>
```

---

## Collapsible

Expandable and collapsible content section.

### Components

- `Collapsible` - Container component
- `CollapsibleTrigger` - Trigger element
- `CollapsibleContent` - Content area

### Props

**Collapsible**
- `open`: `boolean` - Open state
- `onOpenChange`: `(open: boolean) => void` - Change handler
- Extends `React.ComponentProps<typeof CollapsiblePrimitive.Root>`

**CollapsibleTrigger**
- Extends `React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>`

**CollapsibleContent**
- Extends `React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>`

### Usage

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@repo/ui";

<Collapsible>
  <CollapsibleTrigger>Show more</CollapsibleTrigger>
  <CollapsibleContent>
    <p>Additional content here</p>
  </CollapsibleContent>
</Collapsible>
```

---

## Dialog

Modal dialog overlay.

### Components

- `Dialog` - Root component
- `DialogTrigger` - Trigger element
- `DialogPortal` - Portal container
- `DialogOverlay` - Background overlay
- `DialogContent` - Content container
- `DialogHeader` - Header section
- `DialogFooter` - Footer section
- `DialogTitle` - Title text
- `DialogDescription` - Description text
- `DialogClose` - Close button

### Props

**Dialog**
- `open`: `boolean` - Open state
- `onOpenChange`: `(open: boolean) => void` - Change handler
- Extends `React.ComponentProps<typeof DialogPrimitive.Root>`

**DialogContent**
- Extends `React.ComponentProps<typeof DialogPrimitive.Content>`

**DialogHeader, DialogFooter**
- Extend `React.ComponentProps<"div">`

**DialogTitle**
- Extends `React.ComponentProps<typeof DialogPrimitive.Title>`

**DialogDescription**
- Extends `React.ComponentProps<typeof DialogPrimitive.Description>`

### Usage

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@repo/ui";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description goes here</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button>Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Dropdown Menu

Displays a menu of actions or options.

### Components

- `DropdownMenu` - Root component
- `DropdownMenuPortal` - Portal container
- `DropdownMenuTrigger` - Trigger element
- `DropdownMenuContent` - Content container
- `DropdownMenuGroup` - Group items
- `DropdownMenuItem` - Menu item
- `DropdownMenuCheckboxItem` - Checkbox item
- `DropdownMenuRadioGroup` - Radio group container
- `DropdownMenuRadioItem` - Radio item
- `DropdownMenuLabel` - Label text
- `DropdownMenuSeparator` - Divider
- `DropdownMenuShortcut` - Keyboard shortcut
- `DropdownMenuSub` - Submenu container
- `DropdownMenuSubTrigger` - Submenu trigger
- `DropdownMenuSubContent` - Submenu content

### Props

**DropdownMenuItem**
- `inset`: `boolean` - Add left padding (default: `false`)
- `variant`: `"default" | "destructive"` - Visual style (default: `"default"`)
- Extends `React.ComponentProps<typeof DropdownMenuPrimitive.Item>`

**DropdownMenuCheckboxItem**
- `checked`: `boolean` - Checked state
- Extends `React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>`

**DropdownMenuRadioItem**
- `value`: `string` - Radio value
- Extends `React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>`

**DropdownMenuLabel**
- `inset`: `boolean` - Add left padding (default: `false`)
- Extends `React.ComponentProps<typeof DropdownMenuPrimitive.Label>`

### Usage

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@repo/ui";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem variant="destructive">Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Input

Text input field.

### Components

- `Input` - Input component

### Props

- `type`: `string` - Input type (e.g., "text", "email", "password")
- Extends `React.ComponentProps<"input">`

### Usage

```tsx
import { Input } from "@repo/ui";

<Input type="text" placeholder="Enter text..." />
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
```

---

## Input OTP

One-time password input with individual character slots.

### Components

- `InputOTP` - Root component
- `InputOTPGroup` - Group of slots
- `InputOTPSlot` - Individual character slot
- `InputOTPSeparator` - Visual separator

### Props

**InputOTP**
- `maxLength`: `number` - Maximum number of characters
- `containerClassName`: `string` - Container class name
- Extends `React.ComponentProps<typeof OTPInput>`

**InputOTPSlot**
- `index`: `number` - Slot index (required)
- Extends `React.ComponentProps<"div">`

### Usage

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@repo/ui";

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

---

## Label

Form field label.

### Components

- `Label` - Label component

### Props

- `htmlFor`: `string` - Associated input ID
- Extends `React.ComponentProps<typeof LabelPrimitive.Root>`

### Usage

```tsx
import { Label } from "@repo/ui";
import { Input } from "@repo/ui";

<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>
```

---

## Radio Group

Allows users to select a single option from a list.

### Components

- `RadioGroup` - Container component
- `RadioGroupItem` - Radio button

### Props

**RadioGroup**
- `value`: `string` - Selected value
- `onValueChange`: `(value: string) => void` - Change handler
- Extends `React.ComponentProps<typeof RadioGroupPrimitive.Root>`

**RadioGroupItem**
- `value`: `string` - Radio value (required)
- Extends `React.ComponentProps<typeof RadioGroupPrimitive.Item>`

### Usage

```tsx
import { RadioGroup, RadioGroupItem } from "@repo/ui";
import { Label } from "@repo/ui";

<RadioGroup defaultValue="option1">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>
```

---

## Select

Dropdown selection input.

### Components

- `Select` - Root component
- `SelectGroup` - Group items
- `SelectValue` - Placeholder/value display
- `SelectTrigger` - Trigger button
- `SelectContent` - Dropdown content
- `SelectLabel` - Group label
- `SelectItem` - Selectable item
- `SelectSeparator` - Divider
- `SelectScrollUpButton` - Scroll up button
- `SelectScrollDownButton` - Scroll down button

### Props

**Select**
- `value`: `string` - Selected value
- `onValueChange`: `(value: string) => void` - Change handler
- Extends `React.ComponentProps<typeof SelectPrimitive.Root>`

**SelectTrigger**
- `size`: `"sm" | "default"` - Trigger size (default: `"default"`)
- Extends `React.ComponentProps<typeof SelectPrimitive.Trigger>`

**SelectItem**
- `value`: `string` - Item value (required)
- Extends `React.ComponentProps<typeof SelectPrimitive.Item>`

### Usage

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

---

## Separator

Visual divider between content.

### Components

- `Separator` - Separator component

### Props

- `orientation`: `"horizontal" | "vertical"` - Separator direction (default: `"horizontal"`)
- `decorative`: `boolean` - Whether the separator is decorative (default: `true`)
- Extends `React.ComponentProps<typeof SeparatorPrimitive.Root>`

### Usage

```tsx
import { Separator } from "@repo/ui";

<div>
  <p>Content above</p>
  <Separator />
  <p>Content below</p>
</div>

<div className="flex gap-4">
  <span>Left</span>
  <Separator orientation="vertical" />
  <span>Right</span>
</div>
```

---

## Sheet

Side panel overlay.

### Components

- `Sheet` - Root component
- `SheetTrigger` - Trigger element
- `SheetClose` - Close button
- `SheetPortal` - Portal container
- `SheetOverlay` - Background overlay
- `SheetContent` - Content container
- `SheetHeader` - Header section
- `SheetFooter` - Footer section
- `SheetTitle` - Title text
- `SheetDescription` - Description text

### Props

**Sheet**
- `open`: `boolean` - Open state
- `onOpenChange`: `(open: boolean) => void` - Change handler
- Extends `React.ComponentProps<typeof SheetPrimitive.Root>`

**SheetContent**
- `side`: `"top" | "right" | "bottom" | "left"` - Sheet position (default: `"right"`)
- Extends `React.ComponentProps<typeof SheetPrimitive.Content>`

### Usage

```tsx
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@repo/ui";

<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
      <SheetDescription>Sheet description goes here</SheetDescription>
    </SheetHeader>
    <div>Sheet content</div>
  </SheetContent>
</Sheet>
```

---

## Sidebar

Application sidebar navigation.

### Components

- `SidebarProvider` - Context provider
- `Sidebar` - Sidebar container
- `SidebarTrigger` - Toggle button
- `SidebarRail` - Resize handle
- `SidebarInset` - Main content area
- `SidebarInput` - Search input
- `SidebarHeader` - Header section
- `SidebarFooter` - Footer section
- `SidebarSeparator` - Divider
- `SidebarContent` - Main content area
- `SidebarGroup` - Group container
- `SidebarGroupLabel` - Group label
- `SidebarGroupAction` - Group action button
- `SidebarGroupContent` - Group content
- `SidebarMenu` - Menu list
- `SidebarMenuItem` - Menu item
- `SidebarMenuButton` - Menu button
- `SidebarMenuAction` - Menu action button
- `SidebarMenuBadge` - Menu badge
- `SidebarMenuSkeleton` - Loading skeleton
- `SidebarMenuSub` - Submenu list
- `SidebarMenuSubItem` - Submenu item
- `SidebarMenuSubButton` - Submenu button
- `useSidebar` - Hook for sidebar state

### Props

**SidebarProvider**
- `defaultOpen`: `boolean` - Default open state (default: `true`)
- `open`: `boolean` - Controlled open state
- `onOpenChange`: `(open: boolean) => void` - Change handler
- Extends `React.ComponentProps<"div">`

**Sidebar**
- `side`: `"left" | "right"` - Sidebar position (default: `"left"`)
- `variant`: `"sidebar" | "floating" | "inset"` - Visual style (default: `"sidebar"`)
- `collapsible`: `"offcanvas" | "icon" | "none"` - Collapse behavior (default: `"offcanvas"`)
- Extends `React.ComponentProps<"div">`

**SidebarMenuButton**
- `isActive`: `boolean` - Active state (default: `false`)
- `variant`: `"default" | "outline"` - Visual style (default: `"default"`)
- `size`: `"default" | "sm" | "lg"` - Button size (default: `"default"`)
- `tooltip`: `string | React.ComponentProps<typeof TooltipContent>` - Tooltip content
- `asChild`: `boolean` - Use child as rendered element (default: `false`)

**SidebarMenuSubButton**
- `isActive`: `boolean` - Active state (default: `false`)
- `size`: `"sm" | "md"` - Button size (default: `"md"`)
- `asChild`: `boolean` - Use child as rendered element (default: `false`)

### Usage

```tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset
} from "@repo/ui";

<SidebarProvider>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/">Home</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <a href="/dashboard">Dashboard</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>
    <header>
      <SidebarTrigger />
    </header>
    <main>Content</main>
  </SidebarInset>
</SidebarProvider>
```

---

## Skeleton

Loading placeholder.

### Components

- `Skeleton` - Skeleton component

### Props

- Extends `React.ComponentProps<"div">`

### Usage

```tsx
import { Skeleton } from "@repo/ui";

<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />
```

---

## Sonner

Toast notification system.

### Components

- `Toaster` - Toast container (uses Sonner library)

### Props

- Extends `ToasterProps` from "sonner"

### Usage

```tsx
import { Toaster } from "@repo/ui";
import { toast } from "sonner";

// Add to app root
<Toaster />

// Trigger toast
toast("Event has been created");
toast.success("Profile updated");
toast.error("Something went wrong");
```

---

## Table

Data table display.

### Components

- `Table` - Table container
- `TableHeader` - Header section
- `TableBody` - Body section
- `TableFooter` - Footer section
- `TableHead` - Header cell
- `TableRow` - Table row
- `TableCell` - Table cell
- `TableCaption` - Table caption

### Props

All components extend their respective HTML element props:
- `Table`: `React.ComponentProps<"table">`
- `TableHeader`: `React.ComponentProps<"thead">`
- `TableBody`: `React.ComponentProps<"tbody">`
- `TableFooter`: `React.ComponentProps<"tfoot">`
- `TableRow`: `React.ComponentProps<"tr">`
- `TableHead`: `React.ComponentProps<"th">`
- `TableCell`: `React.ComponentProps<"td">`
- `TableCaption`: `React.ComponentProps<"caption">`

### Usage

```tsx
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@repo/ui";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Jane Smith</TableCell>
      <TableCell>jane@example.com</TableCell>
      <TableCell>User</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Tabs

Tabbed content interface.

### Components

- `Tabs` - Root component
- `TabsList` - Tab list container
- `TabsTrigger` - Tab trigger button
- `TabsContent` - Tab content panel

### Props

**Tabs**
- `value`: `string` - Active tab value
- `onValueChange`: `(value: string) => void` - Change handler
- Extends `React.ComponentProps<typeof TabsPrimitive.Root>`

**TabsTrigger**
- `value`: `string` - Tab value (required)
- Extends `React.ComponentProps<typeof TabsPrimitive.Trigger>`

**TabsContent**
- `value`: `string` - Tab value (required)
- Extends `React.ComponentProps<typeof TabsPrimitive.Content>`

### Usage

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";

<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    <p>Account settings</p>
  </TabsContent>
  <TabsContent value="password">
    <p>Password settings</p>
  </TabsContent>
</Tabs>
```

---

## Textarea

Multi-line text input.

### Components

- `Textarea` - Textarea component

### Props

- Extends `React.ComponentProps<"textarea">`

### Usage

```tsx
import { Textarea } from "@repo/ui";

<Textarea placeholder="Enter your message..." />
<Textarea rows={5} placeholder="Long message..." />
```

---

## Tooltip

Displays additional information on hover.

### Components

- `TooltipProvider` - Context provider
- `Tooltip` - Root component
- `TooltipTrigger` - Trigger element
- `TooltipContent` - Tooltip content

### Props

**TooltipProvider**
- `delayDuration`: `number` - Delay before showing tooltip in ms (default: `0`)
- Extends `React.ComponentProps<typeof TooltipPrimitive.Provider>`

**Tooltip**
- `open`: `boolean` - Open state
- `onOpenChange`: `(open: boolean) => void` - Change handler
- Extends `React.ComponentProps<typeof TooltipPrimitive.Root>`

**TooltipContent**
- `sideOffset`: `number` - Distance from trigger (default: `0`)
- Extends `React.ComponentProps<typeof TooltipPrimitive.Content>`

### Usage

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@repo/ui";

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>
    <p>Additional information</p>
  </TooltipContent>
</Tooltip>
```

---

## Utility

### cn

Utility function for merging class names with Tailwind CSS conflict resolution.

```tsx
import { cn } from "@repo/ui";

<div className={cn("text-base", "text-lg")} />
// Results in: "text-lg" (later class wins)

<div className={cn("p-4", className)} />
// Merges with custom className prop
```
