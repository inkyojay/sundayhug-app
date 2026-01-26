# Table

A flexible table component system for displaying tabular data with built-in responsive behavior, hover states, and row selection support.

## Import

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@sundayhug/ui/components/table";
```

## Overview

The Table component provides a comprehensive system for creating data tables with semantic HTML table elements. It includes automatic horizontal scrolling for responsive layouts, hover effects, selection states, and proper spacing for checkbox integration. The component follows a composable design where standard table elements (thead, tbody, tfoot, tr, th, td) are enhanced with consistent styling and behavior.

## Subcomponents

### Table

The main container component that wraps the table element with a responsive overflow container.

```tsx
<Table>
  {/* Table content */}
</Table>
```

**Structure:**
- Outer container (div): Provides responsive overflow handling
- Inner table element: The actual HTML table

**Outer Container Styling:**
- Responsive overflow: overflow-x-auto (horizontal scrolling on narrow screens)
- Full width: w-full
- Relative positioning for absolute children
- Data attribute: `data-slot="table-container"`

**Table Element Styling:**
- Full width: w-full
- Caption position: caption-bottom (captions appear below table)
- Text size: text-sm (14px)
- Data attribute: `data-slot="table"`

**Responsive Behavior:**
- On narrow screens, the table scrolls horizontally rather than breaking layout
- Container maintains full width while table can exceed it

### TableHeader

The header section containing column headers.

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Column 1</TableHead>
    <TableHead>Column 2</TableHead>
  </TableRow>
</TableHeader>
```

**Styling:**
- Border on rows: `[&_tr]:border-b` applies bottom border to all contained rows
- Data attribute: `data-slot="table-header"`

**Behavior:**
- Typically contains a single TableRow with multiple TableHead cells
- Rows in the header have bottom borders for visual separation

### TableBody

The main content section containing data rows.

```tsx
<TableBody>
  <TableRow>
    <TableCell>Data 1</TableCell>
    <TableCell>Data 2</TableCell>
  </TableRow>
</TableBody>
```

**Styling:**
- Last row border removal: `[&_tr:last-child]:border-0` removes border from the last row
- Data attribute: `data-slot="table-body"`

**Behavior:**
- Contains multiple TableRow elements
- All rows except the last have bottom borders

### TableFooter

The footer section for summary rows or additional information.

```tsx
<TableFooter>
  <TableRow>
    <TableCell>Total</TableCell>
    <TableCell>$100</TableCell>
  </TableRow>
</TableFooter>
```

**Styling:**
- Background: bg-muted/50 (subtle muted background with 50% opacity)
- Border: border-t (top border for separation)
- Font weight: font-medium
- Last row border: `[&>tr]:last:border-b-0` removes border from last row
- Data attribute: `data-slot="table-footer"`

**Usage:**
- Typically used for totals, summaries, or aggregate data
- Visually distinguished from body with background color

### TableRow

A table row element with hover and selection states.

```tsx
<TableRow>
  <TableCell>Cell 1</TableCell>
  <TableCell>Cell 2</TableCell>
</TableRow>
```

**Styling:**
- Hover effect: hover:bg-muted/50 (muted background on hover)
- Selection state: data-[state=selected]:bg-muted (muted background when selected)
- Border: border-b (bottom border)
- Transition: transition-colors (smooth color transitions)
- Data attribute: `data-slot="table-row"`

**Interactive States:**
- Default: Transparent background with bottom border
- Hover: Muted background (50% opacity)
- Selected (data-state="selected"): Muted background (full opacity)
- Transitions animate smoothly between states

### TableHead

A table header cell element.

```tsx
<TableHead>Column Name</TableHead>
```

**Styling:**
- Text color: text-foreground
- Height: h-10 (40px)
- Padding: px-2 (horizontal padding of 8px)
- Text alignment: text-left
- Vertical alignment: align-middle
- Font weight: font-medium
- White space: whitespace-nowrap (prevents text wrapping)
- Checkbox support: `[&:has([role=checkbox])]:pr-0` removes right padding when containing checkbox
- Checkbox alignment: `[&>[role=checkbox]]:translate-y-[2px]` adjusts checkbox vertical position
- Data attribute: `data-slot="table-head"`

**Usage:**
- Used within TableHeader rows
- Fixed height ensures consistent header sizing
- Special handling for checkbox columns

### TableCell

A table data cell element.

```tsx
<TableCell>Cell content</TableCell>
```

**Styling:**
- Padding: p-2 (8px on all sides)
- Vertical alignment: align-middle
- White space: whitespace-nowrap (prevents text wrapping)
- Checkbox support: `[&:has([role=checkbox])]:pr-0` removes right padding when containing checkbox
- Checkbox alignment: `[&>[role=checkbox]]:translate-y-[2px]` adjusts checkbox vertical position
- Data attribute: `data-slot="table-cell"`

**Usage:**
- Used within TableBody and TableFooter rows
- Uniform padding for consistent cell spacing
- Special handling for checkbox columns

### TableCaption

A caption element for describing the table.

```tsx
<TableCaption>A list of recent transactions</TableCaption>
```

**Styling:**
- Text color: text-muted-foreground
- Margin: mt-4 (16px top margin)
- Text size: text-sm (14px)
- Data attribute: `data-slot="table-caption"`

**Position:**
- Appears below the table (caption-bottom set on Table component)
- Provides context or description for the table content

## Usage Examples

### Example 1: Basic Data Table

Simple table displaying user information.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";

export function BasicTable() {
  const users = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User" },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 2: Table with Caption

Table with descriptive caption for accessibility.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@sundayhug/ui/components/table";

export function TableWithCaption() {
  return (
    <Table>
      <TableCaption>A list of your recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>INV-001</TableCell>
          <TableCell>Paid</TableCell>
          <TableCell>$250.00</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>INV-002</TableCell>
          <TableCell>Pending</TableCell>
          <TableCell>$150.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
```

### Example 3: Table with Footer

Table including summary or total rows in the footer.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";

export function TableWithFooter() {
  const transactions = [
    { id: 1, description: "Product A", amount: 100 },
    { id: 2, description: "Product B", amount: 150 },
    { id: 3, description: "Product C", amount: 75 },
  ];

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{transaction.description}</TableCell>
            <TableCell className="text-right">${transaction.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">${total}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
```

### Example 4: Table with Checkboxes

Table with row selection using checkboxes.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";
import { Checkbox } from "@sundayhug/ui/components/checkbox";

export function TableWithCheckboxes() {
  const [selected, setSelected] = React.useState<number[]>([]);

  const items = [
    { id: 1, name: "Task 1", status: "Complete" },
    { id: 2, name: "Task 2", status: "In Progress" },
    { id: 3, name: "Task 3", status: "Pending" },
  ];

  const toggleSelection = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.length === items.length ? [] : items.map((item) => item.id)
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selected.length === items.length}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            data-state={selected.includes(item.id) ? "selected" : undefined}
          >
            <TableCell>
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={() => toggleSelection(item.id)}
                aria-label={`Select ${item.name}`}
              />
            </TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 5: Sortable Table

Table with clickable column headers for sorting.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@sundayhug/ui/components/button";

export function SortableTable() {
  const [sortBy, setSortBy] = React.useState<"name" | "score">("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const data = [
    { id: 1, name: "Alice", score: 95 },
    { id: 2, name: "Bob", score: 87 },
    { id: 3, name: "Charlie", score: 92 },
  ];

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const modifier = sortOrder === "asc" ? 1 : -1;
    return aVal > bVal ? modifier : -modifier;
  });

  const handleSort = (column: "name" | "score") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => handleSort("name")}
            >
              Name
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => handleSort("score")}
            >
              Score
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 6: Responsive Wide Table

Table with many columns that scrolls horizontally on narrow screens.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";

export function WideTable() {
  const orders = [
    {
      id: "ORD-001",
      customer: "John Doe",
      product: "Laptop",
      quantity: 1,
      price: 999,
      date: "2024-01-15",
      status: "Shipped",
    },
    {
      id: "ORD-002",
      customer: "Jane Smith",
      product: "Mouse",
      quantity: 2,
      price: 29,
      date: "2024-01-16",
      status: "Delivered",
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.id}</TableCell>
            <TableCell>{order.customer}</TableCell>
            <TableCell>{order.product}</TableCell>
            <TableCell>{order.quantity}</TableCell>
            <TableCell className="text-right">${order.price}</TableCell>
            <TableCell>{order.date}</TableCell>
            <TableCell>{order.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 7: Table with Actions

Table with action buttons in each row.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";
import { Button } from "@sundayhug/ui/components/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sundayhug/ui/components/dropdown-menu";

export function TableWithActions() {
  const users = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 8: Table with Status Badges

Table displaying status with colored badges.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";
import { Badge } from "@sundayhug/ui/components/badge";

export function TableWithBadges() {
  const tasks = [
    { id: 1, name: "Design homepage", status: "complete" },
    { id: 2, name: "Implement API", status: "in-progress" },
    { id: 3, name: "Write documentation", status: "pending" },
  ];

  const statusVariants = {
    complete: "default",
    "in-progress": "secondary",
    pending: "outline",
  } as const;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>{task.name}</TableCell>
            <TableCell>
              <Badge variant={statusVariants[task.status]}>
                {task.status.replace("-", " ")}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Example 9: Empty State Table

Table with empty state when no data is available.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";
import { FileQuestion } from "lucide-react";

export function EmptyTable() {
  const data: any[] = [];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileQuestion className="size-8" />
                <p>No results found</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.role}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
```

### Example 10: Compact Table

Smaller, more compact table with custom spacing.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@sundayhug/ui/components/table";

export function CompactTable() {
  const metrics = [
    { metric: "Revenue", value: "$12,345", change: "+12%" },
    { metric: "Users", value: "1,234", change: "+5%" },
    { metric: "Sessions", value: "5,678", change: "+8%" },
  ];

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-8">Metric</TableHead>
          <TableHead className="h-8">Value</TableHead>
          <TableHead className="h-8">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((row) => (
          <TableRow key={row.metric}>
            <TableCell className="py-1 font-medium">{row.metric}</TableCell>
            <TableCell className="py-1">{row.value}</TableCell>
            <TableCell className="py-1 text-green-600">{row.change}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Responsive Patterns

The Table component includes built-in responsive behavior for handling wide tables on narrow screens.

### Horizontal Scrolling

The outer container provides automatic horizontal scrolling when the table content exceeds the available width:

```tsx
<Table>
  {/* Wide table with many columns */}
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
      <TableHead>Column 3</TableHead>
      <TableHead>Column 4</TableHead>
      <TableHead>Column 5</TableHead>
      <TableHead>Column 6</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Rows with many cells */}
  </TableBody>
</Table>
```

**Behavior:**
- Container: `overflow-x-auto` enables horizontal scrolling
- Table maintains its natural width
- Users can scroll horizontally to view hidden columns
- Vertical scrolling remains normal

### Mobile Considerations

For mobile-optimized tables, consider these patterns:

**1. Sticky First Column:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="sticky left-0 bg-background">Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Phone</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="sticky left-0 bg-background font-medium">
        John Doe
      </TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>555-0123</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**2. Hide Optional Columns on Mobile:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead className="hidden sm:table-cell">Email</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="hidden md:table-cell">Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell className="hidden sm:table-cell">john@example.com</TableCell>
      <TableCell>Active</TableCell>
      <TableCell className="hidden md:table-cell">2024-01-15</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**3. Compact Mobile Layout:**
```tsx
<Table className="text-xs sm:text-sm">
  <TableHeader>
    <TableRow>
      <TableHead className="h-8 px-1 sm:h-10 sm:px-2">Name</TableHead>
      <TableHead className="h-8 px-1 sm:h-10 sm:px-2">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="p-1 sm:p-2">John Doe</TableCell>
      <TableCell className="p-1 sm:p-2">Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Composition Patterns

The Table component system is designed for flexible composition following standard HTML table structure.

### Pattern 1: Basic Structure

Minimal table requires Table, TableHeader, TableBody, TableRow, TableHead, and TableCell:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Pattern 2: Optional Components

Add TableCaption and TableFooter as needed:

```tsx
<Table>
  <TableCaption>Optional caption for context</TableCaption>
  <TableHeader>{/* ... */}</TableHeader>
  <TableBody>{/* ... */}</TableBody>
  <TableFooter>{/* Optional footer for totals */}</TableFooter>
</Table>
```

### Pattern 3: Row Selection

Use `data-state="selected"` on TableRow to trigger selection styling:

```tsx
<TableRow data-state={isSelected ? "selected" : undefined}>
  <TableCell>{/* ... */}</TableCell>
</TableRow>
```

**Selection States:**
- No attribute: Default transparent background
- `data-state="selected"`: Muted background to indicate selection
- Hover: Muted background (50% opacity) regardless of selection state

### Pattern 4: Checkbox Integration

TableHead and TableCell have special styling for checkbox columns:

```tsx
<TableRow>
  {/* Checkbox cell automatically gets adjusted padding */}
  <TableCell>
    <Checkbox role="checkbox" />
  </TableCell>
  {/* Regular cells maintain normal padding */}
  <TableCell>Normal content</TableCell>
</TableRow>
```

**Automatic Behaviors:**
- `[&:has([role=checkbox])]:pr-0`: Removes right padding from cells containing checkboxes
- `[&>[role=checkbox]]:translate-y-[2px]`: Vertically centers checkboxes

### Pattern 5: Column Alignment

Use className to customize column alignment:

```tsx
<TableRow>
  <TableHead className="text-left">Name</TableHead>
  <TableHead className="text-center">Status</TableHead>
  <TableHead className="text-right">Amount</TableHead>
</TableRow>
```

Common alignments:
- `text-left`: Left-aligned (default)
- `text-center`: Center-aligned
- `text-right`: Right-aligned (typical for numbers)

### Pattern 6: Fixed Column Widths

Control column widths using width utilities:

```tsx
<TableRow>
  <TableHead className="w-12">{/* Checkbox column */}</TableHead>
  <TableHead className="w-[200px]">Name</TableHead>
  <TableHead className="w-24">Status</TableHead>
  <TableHead>Description</TableHead> {/* Auto width */}
</TableRow>
```

**Width Strategies:**
- Fixed width: `w-[200px]` for precise pixel width
- Utility width: `w-12`, `w-24`, etc. for Tailwind scale
- Auto width: No class for flexible sizing
- Minimum width: `min-w-[200px]` for responsive minimum

### Pattern 7: Nowrap vs Wrap

Control text wrapping behavior:

```tsx
{/* Default: nowrap prevents line breaks */}
<TableCell>Long text stays on one line</TableCell>

{/* Override to allow wrapping */}
<TableCell className="whitespace-normal">
  This longer text can wrap to multiple lines if needed
</TableCell>

{/* Truncate with ellipsis */}
<TableCell className="max-w-[200px] truncate">
  Very long text that will be truncated with ellipsis
</TableCell>
```

## Accessibility

The Table component follows semantic HTML and includes several accessibility features.

### Semantic Structure

The component uses proper HTML table elements:
- `<table>` for the table container
- `<thead>` for TableHeader
- `<tbody>` for TableBody
- `<tfoot>` for TableFooter
- `<tr>` for TableRow
- `<th>` for TableHead
- `<td>` for TableCell
- `<caption>` for TableCaption

### Data Attributes

Each subcomponent includes a unique `data-slot` attribute for testing and styling:
- `data-slot="table-container"`
- `data-slot="table"`
- `data-slot="table-header"`
- `data-slot="table-body"`
- `data-slot="table-footer"`
- `data-slot="table-row"`
- `data-slot="table-head"`
- `data-slot="table-cell"`
- `data-slot="table-caption"`

### Accessibility Best Practices

**1. Always Use TableCaption:**

Provide context for screen reader users:

```tsx
<Table>
  <TableCaption>
    List of team members and their roles
  </TableCaption>
  {/* ... */}
</Table>
```

If you don't want the caption visible, use the `sr-only` class:

```tsx
<TableCaption className="sr-only">
  List of team members and their roles
</TableCaption>
```

**2. Scope Headers Appropriately:**

Add scope attributes to header cells:

```tsx
<TableHead scope="col">Name</TableHead>
<TableHead scope="col">Email</TableHead>
```

For row headers:

```tsx
<TableCell scope="row" className="font-medium">
  John Doe
</TableCell>
```

**3. Label Interactive Elements:**

Ensure checkboxes and buttons have proper labels:

```tsx
<TableCell>
  <Checkbox aria-label="Select row" />
</TableCell>

<TableCell>
  <Button size="icon" variant="ghost" aria-label="Open menu">
    <MoreVertical />
  </Button>
</TableCell>
```

**4. Announce Sort State:**

For sortable columns, announce the current sort:

```tsx
<TableHead>
  <Button
    variant="ghost"
    aria-label={`Name, sorted ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
  >
    Name
    <ArrowUpDown />
  </Button>
</TableHead>
```

**5. Row Selection State:**

Announce selection state to screen readers:

```tsx
<TableRow
  data-state={isSelected ? "selected" : undefined}
  aria-selected={isSelected}
>
  {/* ... */}
</TableRow>
```

**6. Empty State:**

Make empty states accessible:

```tsx
<TableBody>
  {data.length === 0 ? (
    <TableRow>
      <TableCell colSpan={3} role="status" aria-live="polite">
        No results found
      </TableCell>
    </TableRow>
  ) : (
    {/* Data rows */}
  )}
</TableBody>
```

### Keyboard Navigation

The table supports standard keyboard navigation:
- **Tab**: Move focus to next interactive element (checkbox, button, link)
- **Shift+Tab**: Move focus to previous interactive element
- **Arrow keys**: Native browser scrolling for overflow content
- **Space/Enter**: Activate focused interactive elements

## Styling Details

### Layout System

**Table Container:**
- Outer div: `relative w-full overflow-x-auto`
  - Enables horizontal scrolling for wide tables
  - Full width container
  - Relative positioning for absolute children
- Inner table: `w-full caption-bottom text-sm`
  - Table takes full width of container
  - Captions positioned below table
  - Small text size (14px) for data density

**Table Structure:**
- TableHeader: Contains header rows with bottom borders
- TableBody: Contains data rows, last row has no border
- TableFooter: Distinct background with top border

### Spacing

**Cell Padding:**
- TableHead: `h-10 px-2` (40px height, 8px horizontal padding)
- TableCell: `p-2` (8px padding on all sides)

**Checkbox Columns:**
- Cells containing `[role=checkbox]`: Right padding removed (`pr-0`)
- Checkbox elements: Slightly adjusted vertically (`translate-y-[2px]`)

**Row Spacing:**
- Border between rows: `border-b` (bottom border)
- TableBody last row: Border removed for clean edge
- TableFooter last row: Border removed

### Colors and Borders

**TableRow States:**
- Default: Transparent background
- Hover: `hover:bg-muted/50` (muted background at 50% opacity)
- Selected: `data-[state=selected]:bg-muted` (muted background at full opacity)
- Transition: `transition-colors` (smooth color transitions)

**TableFooter:**
- Background: `bg-muted/50` (subtle muted background)
- Border: `border-t` (top border for separation)
- Font: `font-medium` (medium weight for emphasis)

**TableCaption:**
- Color: `text-muted-foreground` (reduced emphasis)
- Size: `text-sm` (14px)
- Spacing: `mt-4` (16px margin top)

**Borders:**
- TableHeader rows: `[&_tr]:border-b` (bottom border on all rows)
- TableBody rows: `border-b` on TableRow (except last)
- All borders use theme-aware border color

### Typography

**TableHead:**
- Color: `text-foreground` (primary text color)
- Weight: `font-medium` (500)
- Alignment: `text-left` (default, can be overridden)
- Whitespace: `whitespace-nowrap` (prevents wrapping)

**TableCell:**
- Color: Inherits from parent (typically `text-foreground`)
- Weight: Normal (can be overridden with `font-medium` for emphasis)
- Alignment: Left-aligned by default
- Whitespace: `whitespace-nowrap` (prevents wrapping)

**Overall Table:**
- Base size: `text-sm` (14px)
- Line height: Default for sm size
- Alignment: `align-middle` on cells (vertical centering)

### Dark Mode

All theme colors automatically adapt to dark mode:
- Table background adapts to dark theme
- Text colors (foreground, muted-foreground) invert appropriately
- Hover and selection states use dark mode muted colors
- Borders adjust to visible contrast in dark mode

### Responsive Behavior

**Overflow Container:**
- `overflow-x-auto`: Enables horizontal scrolling
- `w-full`: Container takes full available width
- Scrollbar appears only when table exceeds container width

**Whitespace Handling:**
- Default `whitespace-nowrap` prevents cell wrapping
- Override with `whitespace-normal` for wrapping cells
- Use `truncate` with `max-w-*` for ellipsis

## Notes

- Uses the `cn` utility for className merging
- All styles are Tailwind CSS classes
- Each subcomponent has a unique `data-slot` attribute for easy targeting
- The outer container div handles responsive overflow, not the table element
- Row hover and selection states use the same background color at different opacities
- Checkbox columns automatically get adjusted padding and alignment
- `whitespace-nowrap` on cells prevents text wrapping by default (can be overridden)
- TableCaption appears below the table due to `caption-bottom` on Table
- TableFooter is visually distinguished with a background color
- All subcomponents forward refs and accept standard HTML element props
- Selection state is controlled via `data-state="selected"` attribute
- Border removal on last rows prevents double borders at table edges
- The component works seamlessly with Checkbox, Button, Badge, and other UI components
