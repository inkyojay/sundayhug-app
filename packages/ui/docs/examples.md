# Real-World Usage Examples

This guide showcases practical, real-world examples of composing multiple components from `@sundayhug/ui` to build common UI patterns.

## Table of Contents

- [Login Form with Validation](#login-form-with-validation)
- [Confirmation Dialog](#confirmation-dialog)
- [User Profile Card](#user-profile-card)
- [Navigation Dropdown Menu](#navigation-dropdown-menu)
- [Data Table with Actions](#data-table-with-actions)
- [Settings Panel with Tabs](#settings-panel-with-tabs)
- [Contact Form with Feedback](#contact-form-with-feedback)
- [Dashboard Stats Cards](#dashboard-stats-cards)

---

## Login Form with Validation

A complete login form with client-side validation, error states, and user feedback.

```tsx
"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@sundayhug/ui";
import { AlertCircleIcon, LogInIcon } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Handle successful login
    } catch (error) {
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      {showError && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>
            Invalid email or password. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        <LogInIcon />
        {isLoading ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
}
```

---

## Confirmation Dialog

A reusable confirmation dialog pattern for destructive actions.

```tsx
"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@sundayhug/ui";
import { TrashIcon } from "lucide-react";

interface DeleteConfirmationProps {
  itemName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmation({
  itemName,
  onConfirm,
}: DeleteConfirmationProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <TrashIcon />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <strong>{itemName}</strong> from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage:**

```tsx
export function MyComponent() {
  const handleDelete = async () => {
    await fetch("/api/items/123", { method: "DELETE" });
    // Handle success
  };

  return <DeleteConfirmation itemName="My Item" onConfirm={handleDelete} />;
}
```

---

## User Profile Card

A comprehensive profile card using Card, Avatar, and Badge components.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
} from "@sundayhug/ui";
import { MailIcon, MapPinIcon, CalendarIcon, MoreVerticalIcon } from "lucide-react";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    role: string;
    location: string;
    joinedDate: string;
    avatarUrl?: string;
    status: "active" | "inactive" | "pending";
  };
}

export function UserProfileCard({ user }: UserProfileProps) {
  const statusVariant = {
    active: "default" as const,
    inactive: "secondary" as const,
    pending: "outline" as const,
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="size-16">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.role}</CardDescription>
            <Badge variant={statusVariant[user.status]} className="mt-2">
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Badge>
          </div>
        </div>
        <CardAction>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MailIcon className="size-4 text-muted-foreground" />
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPinIcon className="size-4 text-muted-foreground" />
          <span>{user.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span>Joined {user.joinedDate}</span>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1">
          Message
        </Button>
        <Button className="flex-1">View Profile</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Navigation Dropdown Menu

A feature-rich user menu with sections, keyboard shortcuts, and nested items.

```tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@sundayhug/ui";
import {
  UserIcon,
  SettingsIcon,
  CreditCardIcon,
  LogOutIcon,
  HelpCircleIcon,
  PaletteIcon,
  MonitorIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const handleThemeChange = (theme: string) => {
    // Handle theme change logic
    console.log("Theme changed to:", theme);
  };

  const handleLogout = () => {
    // Handle logout logic
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-10 rounded-full p-0">
          <Avatar className="size-10">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <UserIcon />
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/billing")}>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <SettingsIcon />
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleThemeChange("light")}>
              <SunIcon />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
              <MoonIcon />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("system")}>
              <MonitorIcon />
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push("/help")}>
          <HelpCircleIcon />
          Help & Support
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOutIcon />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Data Table with Actions

A complete data table with row actions, status badges, and dropdown menus.

```tsx
"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@sundayhug/ui";
import { MoreHorizontalIcon, EditIcon, TrashIcon, EyeIcon } from "lucide-react";

interface Order {
  id: string;
  customer: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  total: number;
  date: string;
}

interface OrdersTableProps {
  orders: Order[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function OrdersTable({
  orders,
  onView,
  onEdit,
  onDelete,
}: OrdersTableProps) {
  const statusVariants = {
    pending: "outline" as const,
    processing: "default" as const,
    completed: "secondary" as const,
    cancelled: "destructive" as const,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[order.status]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(order.id)}>
                        <EyeIcon />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(order.id)}>
                        <EditIcon />
                        Edit Order
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete?.(order.id)}
                      >
                        <TrashIcon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Usage:**

```tsx
const orders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    status: "completed" as const,
    total: 125.99,
    date: "2024-01-15",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    status: "processing" as const,
    total: 89.99,
    date: "2024-01-16",
  },
];

<OrdersTable
  orders={orders}
  onView={(id) => console.log("View", id)}
  onEdit={(id) => console.log("Edit", id)}
  onDelete={(id) => console.log("Delete", id)}
/>;
```

---

## Settings Panel with Tabs

A comprehensive settings panel using Tabs, Cards, and form inputs.

```tsx
"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Separator,
  Alert,
  AlertDescription,
} from "@sundayhug/ui";
import { CheckCircleIcon } from "lucide-react";

export function SettingsPanel() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full max-w-3xl">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile and email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  defaultValue="Software developer and coffee enthusiast"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Manage your email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about new products and features
                  </p>
                </div>
                <input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Security alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts about your account security
                  </p>
                </div>
                <input type="checkbox" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Update Password</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {saved && (
        <Alert className="mt-4">
          <CheckCircleIcon className="text-green-600" />
          <AlertDescription>
            Your settings have been saved successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## Contact Form with Feedback

A contact form with validation, textarea, and success/error feedback.

```tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@sundayhug/ui";
import { SendIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate random success/error
      if (Math.random() > 0.3) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }

    // Reset status after 5 seconds
    setTimeout(() => setStatus("idle"), 5000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Contact Us</CardTitle>
        <CardDescription>
          Fill out the form below and we'll get back to you as soon as possible
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this regarding?"
              required
              disabled={status === "loading"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us more about your inquiry..."
              required
              disabled={status === "loading"}
              className="min-h-32"
            />
          </div>

          {status === "success" && (
            <Alert>
              <CheckCircleIcon className="text-green-600" />
              <AlertTitle>Message Sent!</AlertTitle>
              <AlertDescription>
                Thank you for contacting us. We'll respond within 24 hours.
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to send message. Please try again later.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={status === "loading"} className="w-full sm:w-auto">
            <SendIcon />
            {status === "loading" ? "Sending..." : "Send Message"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

---

## Dashboard Stats Cards

A dashboard layout with multiple stat cards showcasing data visualization.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@sundayhug/ui";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  const trendColor = trend === "up" ? "text-green-600" : "text-red-600";
  const TrendIcon = trend === "up" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="size-3" />
          <span>{Math.abs(change)}%</span>
          <span className="text-muted-foreground">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: 20.1,
      trend: "up" as const,
      icon: <DollarSignIcon className="size-4" />,
    },
    {
      title: "Active Users",
      value: "2,350",
      change: 15.3,
      trend: "up" as const,
      icon: <UsersIcon className="size-4" />,
    },
    {
      title: "Orders",
      value: "1,234",
      change: -5.2,
      trend: "down" as const,
      icon: <ShoppingCartIcon className="size-4" />,
    },
    {
      title: "Conversion Rate",
      value: "3.24%",
      change: 8.7,
      trend: "up" as const,
      icon: <TrendingUpIcon className="size-4" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
```

---

## Additional Tips

### Composition Best Practices

1. **Keep components focused**: Each component should have a single responsibility
2. **Use compound components**: Leverage the built-in subcomponent patterns (Card, Dialog, etc.)
3. **Leverage `asChild`**: Use the `asChild` prop for composition with routing libraries
4. **Maintain consistency**: Use the same variant patterns across your application
5. **Accessibility first**: Always include proper labels, ARIA attributes, and keyboard navigation

### Common Patterns

```tsx
// Form field with error state
<div className="space-y-2">
  <Label htmlFor="field">Field Label</Label>
  <Input id="field" aria-invalid={!!error} />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>

// Card with actions
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardAction>
      <Button variant="ghost" size="icon">
        <MoreVerticalIcon />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>{/* ... */}</CardContent>
</Card>

// Dialog with form
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Form Title</DialogTitle>
      </DialogHeader>
      {/* Form fields */}
      <DialogFooter>
        <Button type="submit">Submit</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### Next Steps

- Explore individual [component documentation](../COMPONENTS.md)
- Review the [usage guide](../USAGE_GUIDE.md) for setup and theming
- Check component-specific docs in the [docs folder](.)
