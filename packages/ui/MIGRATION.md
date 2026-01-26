# Migration Guide: Moving to @sundayhug/ui

This guide will help you migrate from app-specific UI components to the centralized `@sundayhug/ui` package, eliminating code duplication and ensuring consistency across the SundayHug application ecosystem.

## Table of Contents

- [Overview](#overview)
- [Why Migrate?](#why-migrate)
- [Before You Start](#before-you-start)
- [Step-by-Step Migration](#step-by-step-migration)
- [Import Path Changes](#import-path-changes)
- [Breaking Changes Analysis](#breaking-changes-analysis)
- [Gradual Migration Strategy](#gradual-migration-strategy)
- [Component Inventory](#component-inventory)
- [Testing Your Migration](#testing-your-migration)
- [Common Pitfalls](#common-pitfalls)
- [Rollback Strategy](#rollback-strategy)

## Overview

### Current State

Currently, UI components are duplicated across applications:

```
apps/dashboard/app/core/components/ui/
apps/customer/app/core/components/ui/
```

Each app maintains its own copy of components like Button, Input, Card, Dialog, etc. This leads to:
- **Code duplication** - Same component code exists in multiple places
- **Maintenance burden** - Bug fixes must be applied in multiple locations
- **Inconsistency risk** - Components can drift apart over time
- **Larger bundle sizes** - Duplicate code increases app size

### Target State

After migration, all shared UI components will be consumed from:

```
packages/ui/src/components/
```

Applications import from `@sundayhug/ui` instead of local component directories.

## Why Migrate?

### Benefits

✅ **Single Source of Truth** - One component definition for all apps
✅ **Reduced Maintenance** - Fix once, benefit everywhere
✅ **Consistency** - Guaranteed identical behavior across apps
✅ **Better Testing** - Test components once in the shared package
✅ **Smaller Bundles** - No duplicate code in production builds
✅ **Type Safety** - Shared TypeScript types prevent drift
✅ **Easier Updates** - Update shadcn/ui components in one place

### Effort Estimate

- **Small app** (Customer): 2-4 hours
- **Large app** (Dashboard): 4-8 hours
- **Per component migration**: 5-15 minutes

## Before You Start

### Prerequisites

1. **Ensure the package is installed** in your app:

```json
{
  "dependencies": {
    "@sundayhug/ui": "workspace:*"
  }
}
```

2. **Run installation**:

```bash
pnpm install
```

3. **Verify Tailwind configuration** includes the UI package:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@sundayhug/ui/src/**/*.{js,jsx,ts,tsx}", // ✅ Required
  ],
  // ... rest of config
};
```

4. **Import styles** in your root layout (if not already done):

```tsx
import "@sundayhug/ui/styles.css";
```

### Backup Strategy

Before starting migration:

```bash
# Create a feature branch
git checkout -b migrate-to-shared-ui

# Or create a backup of your current components
cp -r app/core/components/ui app/core/components/ui.backup
```

## Step-by-Step Migration

### Phase 1: Audit (15-30 minutes)

1. **List all components** currently used in your app:

```bash
# From your app directory
ls app/core/components/ui/
```

2. **Compare with shared package**:

```bash
ls ../../packages/ui/src/components/
```

3. **Identify components that exist in both places** (these can be migrated immediately)

4. **Identify app-specific components** (these need separate handling - see [Component Inventory](#component-inventory))

### Phase 2: Update Imports (1-2 hours)

You can migrate components one at a time or in batches. We recommend starting with low-risk components like Badge, Avatar, or Skeleton.

#### Option A: Automated Migration (Recommended)

Use find-and-replace with your IDE or command line:

```bash
# Example: Migrate Button imports
# Find: import { Button } from "~/core/components/ui/button"
# Replace: import { Button } from "@sundayhug/ui"

# Using sed (macOS/Linux) - backup first!
find app -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "~/core/components/ui/button"|from "@sundayhug/ui"|g'
```

#### Option B: Manual Migration (Safer)

1. **Pick a component to migrate** (e.g., Button)

2. **Find all usages**:

```bash
# Find all imports
grep -r "from \"~/core/components/ui/button\"" app/
```

3. **Update each import**:

**Before:**
```tsx
import { Button } from "~/core/components/ui/button";
```

**After:**
```tsx
import { Button } from "@sundayhug/ui";
```

4. **Test the component** in your local environment

5. **Repeat for next component**

### Phase 3: Verify (30 minutes - 1 hour)

After migrating imports:

1. **Type check**:

```bash
npm run typecheck
# or
pnpm typecheck
```

2. **Build your app**:

```bash
npm run build
# or
pnpm build
```

3. **Run tests** (if available):

```bash
npm test
# or
pnpm test
```

4. **Manual testing**: Test key user flows that use migrated components

### Phase 4: Cleanup (15-30 minutes)

Once migration is verified:

1. **Remove old component files**:

```bash
# Backup first!
mv app/core/components/ui app/core/components/ui.backup

# Or delete directly
rm -rf app/core/components/ui
```

2. **Update any remaining internal imports** that might reference the old path

3. **Remove the backup** after confirming everything works:

```bash
rm -rf app/core/components/ui.backup
```

## Import Path Changes

### Standard Components

All shared components use a single import path:

| Before | After |
|--------|-------|
| `import { Button } from "~/core/components/ui/button"` | `import { Button } from "@sundayhug/ui"` |
| `import { Input } from "~/core/components/ui/input"` | `import { Input } from "@sundayhug/ui"` |
| `import { Card, CardHeader } from "~/core/components/ui/card"` | `import { Card, CardHeader } from "@sundayhug/ui"` |
| `import { Dialog, DialogContent } from "~/core/components/ui/dialog"` | `import { Dialog, DialogContent } from "@sundayhug/ui"` |

### The `cn` Utility

The `cn` utility function is also exported from the package:

| Before | After |
|--------|-------|
| `import { cn } from "~/core/lib/utils"` | `import { cn } from "@sundayhug/ui"` |

**Note:** You can keep using your local `cn` if you have other utilities in `~/core/lib/utils`. The shared `cn` is provided for convenience.

### Complete Example

**Before Migration:**
```tsx
import { Button, buttonVariants } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "~/core/components/ui/card";
import { cn } from "~/core/lib/utils";

export function LoginForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className={cn("w-full")}>Sign In</Button>
      </CardFooter>
    </Card>
  );
}
```

**After Migration:**
```tsx
import {
  Button,
  buttonVariants,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  cn,
} from "@sundayhug/ui";

export function LoginForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className={cn("w-full")}>Sign In</Button>
      </CardFooter>
    </Card>
  );
}
```

**Key Changes:**
- ✅ Single import statement from `@sundayhug/ui`
- ✅ All components in one place
- ✅ Cleaner, more maintainable code
- ✅ No behavior changes - components work identically

## Breaking Changes Analysis

### Good News: Zero Breaking Changes! 🎉

The shared UI components are **byte-for-byte identical** to the components in the Customer and Dashboard apps. This means:

- ✅ **No API changes** - All props work exactly the same
- ✅ **No style changes** - Visual appearance is identical
- ✅ **No behavior changes** - Event handlers, state management, etc. work the same
- ✅ **No TypeScript changes** - All types are compatible

### Component Comparison

We've verified that the following components are identical across all locations:

- Alert
- Avatar
- Badge
- Button
- Card
- Checkbox
- Collapsible
- Dialog
- Dropdown Menu
- Input
- Input OTP
- Label
- Radio Group
- Select
- Separator
- Sheet
- Sidebar
- Skeleton
- Sonner
- Table
- Tabs
- Textarea
- Tooltip

### What This Means for You

**You can migrate with confidence!** The migration is purely an import path change. Your components will:
- Look the same ✓
- Behave the same ✓
- Have the same TypeScript types ✓
- Pass the same tests ✓

## Gradual Migration Strategy

You don't have to migrate everything at once. Here's a recommended phased approach:

### Strategy 1: Component-by-Component (Recommended)

**Safest approach** - Migrate one component at a time, test, commit.

**Week 1: Low-Risk Components**
- Day 1: Badge, Avatar, Skeleton
- Day 2: Separator, Label
- Day 3: Alert, Tooltip

**Week 2: Form Components**
- Day 1: Input, Textarea
- Day 2: Checkbox, Radio Group
- Day 3: Select

**Week 3: Layout Components**
- Day 1: Card
- Day 2: Table, Tabs
- Day 3: Collapsible

**Week 4: Complex Components**
- Day 1: Button (used everywhere, test thoroughly)
- Day 2: Dialog, Sheet
- Day 3: Dropdown Menu, Sidebar

**Week 5: Cleanup**
- Remove old component files
- Update documentation
- Team celebration! 🎉

### Strategy 2: Feature-by-Feature

Migrate all components used in a specific feature area:

**Sprint 1: Authentication Flow**
- Login page: Button, Input, Card, Label
- Registration: Button, Input, Card, Label, Checkbox
- Password reset: Button, Input, Card, Alert

**Sprint 2: Dashboard**
- Stats cards: Card, Badge, Skeleton
- Data tables: Table, Button, Dropdown Menu
- Navigation: Sidebar

**Sprint 3: User Profile**
- Profile page: Card, Avatar, Button, Input, Textarea
- Settings: Tabs, Input, Checkbox, Radio Group, Select
- Dialogs: Dialog, Button, Alert

### Strategy 3: App-by-App (Multi-App Monorepos)

**Phase 1: Migrate Customer App** (smaller, simpler)
- Fewer components to migrate
- Good learning experience
- Identify any issues early

**Phase 2: Migrate Dashboard App** (larger, more complex)
- Apply lessons learned from Customer app
- More thorough testing required
- May have app-specific components to handle

**Phase 3: New Apps**
- Start with `@sundayhug/ui` from day one
- No migration needed!

### Hybrid Approach (Coexistence)

You can use both old and new components simultaneously during migration:

```tsx
// Old import (not yet migrated)
import { Button } from "~/core/components/ui/button";

// New import (migrated)
import { Card, CardHeader } from "@sundayhug/ui";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        {/* Both work fine together! */}
        <Button>Old Button</Button>
      </CardHeader>
    </Card>
  );
}
```

**Benefits:**
- No rush to migrate everything
- Can migrate during normal feature work
- Lower risk of breaking changes

**Drawbacks:**
- Temporary code duplication
- Confusion about which import to use
- Larger bundle size until migration complete

## Component Inventory

### Shared Components (Available in @sundayhug/ui)

These components are ready to use from the shared package:

| Component | Status | Notes |
|-----------|--------|-------|
| Alert | ✅ Ready | Includes Alert, AlertTitle, AlertDescription |
| Avatar | ✅ Ready | Includes Avatar, AvatarImage, AvatarFallback |
| Badge | ✅ Ready | Multiple variants supported |
| Button | ✅ Ready | All variants and sizes supported |
| Card | ✅ Ready | Includes Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction |
| Checkbox | ✅ Ready | Form-compatible |
| Collapsible | ✅ Ready | Includes Collapsible, CollapsibleTrigger, CollapsibleContent |
| Dialog | ✅ Ready | Includes Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal |
| Dropdown Menu | ✅ Ready | Full menu system with all subcomponents |
| Input | ✅ Ready | All HTML input types supported |
| Input OTP | ✅ Ready | One-time password input |
| Label | ✅ Ready | Form labels with accessibility |
| Radio Group | ✅ Ready | Includes RadioGroup, RadioGroupItem |
| Select | ✅ Ready | Includes Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton |
| Separator | ✅ Ready | Horizontal and vertical dividers |
| Sheet | ✅ Ready | Slide-in panels from all sides |
| Sidebar | ✅ Ready | Full sidebar system with all subcomponents |
| Skeleton | ✅ Ready | Loading placeholders |
| Sonner | ✅ Ready | Toast notifications |
| Table | ✅ Ready | Includes Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption |
| Tabs | ✅ Ready | Includes Tabs, TabsList, TabsTrigger, TabsContent |
| Textarea | ✅ Ready | Multi-line text input |
| Tooltip | ✅ Ready | Includes Tooltip, TooltipTrigger, TooltipContent, TooltipProvider |

### Dashboard-Specific Components (Not in shared package)

These components exist only in the Dashboard app and require special handling:

| Component | Status | Recommendation |
|-----------|--------|----------------|
| Accordion | ⚠️ App-specific | Consider adding to shared package if needed by other apps |
| Alert Dialog | ⚠️ App-specific | Consider adding to shared package (similar to Dialog) |
| Color Badge | ⚠️ Dashboard-only | Keep in Dashboard if truly specific, or generalize and add to shared package |
| Data Table | ⚠️ Dashboard-only | Keep in Dashboard (likely contains Dashboard-specific business logic) |
| Error Display | ⚠️ Dashboard-only | Keep in Dashboard (likely contains Dashboard-specific error handling) |

**Recommendation for App-Specific Components:**

1. **Keep them local** if they contain app-specific business logic
2. **Add to shared package** if they're generic and could benefit other apps
3. **Generalize and share** if they're almost generic but need minor tweaks

**Example Decision Tree:**

```
Is the component used by multiple apps?
├─ Yes → Add to @sundayhug/ui
└─ No → Is it generic enough to be reusable?
   ├─ Yes → Add to @sundayhug/ui
   └─ No → Keep in app-specific components
```

## Testing Your Migration

### Automated Testing

1. **TypeScript Compilation**:

```bash
pnpm typecheck
```

Expected output: No errors related to component imports

2. **Build Test**:

```bash
pnpm build
```

Expected output: Successful build with no warnings about missing modules

3. **Unit Tests** (if available):

```bash
pnpm test
```

Expected output: All tests passing

### Manual Testing Checklist

For each migrated component, verify:

- [ ] **Visual appearance** matches before migration
- [ ] **Interactions** work (clicks, hovers, focus states)
- [ ] **Variants** render correctly (all button variants, badge colors, etc.)
- [ ] **Sizes** work (sm, default, lg, icon)
- [ ] **Dark mode** works (if applicable)
- [ ] **Responsive behavior** works on mobile/tablet/desktop
- [ ] **Accessibility** is maintained (keyboard navigation, screen readers)
- [ ] **Form integration** works (validation states, error messages)
- [ ] **Custom className** props still work
- [ ] **asChild prop** still works (for polymorphic components)

### Testing Priorities

**Critical Components** (test thoroughly):
1. Button - Used everywhere
2. Input - Core user interaction
3. Dialog/Sheet - Critical for modals
4. Card - Common layout component

**Medium Priority**:
5. Select, Checkbox, Radio Group - Forms
6. Table - Data display
7. Dropdown Menu - Navigation

**Low Priority** (visual check sufficient):
8. Badge, Avatar, Skeleton
9. Separator, Label
10. Alert, Tooltip

### Smoke Test Script

Create a test page that exercises all migrated components:

```tsx
// app/test/ui-migration-test.tsx
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // ... all other components
} from "@sundayhug/ui";

export default function UIMigrationTest() {
  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Buttons</h2>
        <div className="flex gap-2">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Inputs</h2>
        <div className="space-y-2 max-w-sm">
          <Input placeholder="Default input" />
          <Input placeholder="Disabled input" disabled />
          <Input placeholder="Error input" aria-invalid />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Cards</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            Card content goes here
          </CardContent>
        </Card>
      </section>

      {/* Add sections for all other components */}
    </div>
  );
}
```

Visit this page in your browser to visually verify all components work correctly.

## Common Pitfalls

### 1. Forgetting to Update Tailwind Config

**Problem:**
```
Error: Cannot find module '@sundayhug/ui/src/components/button'
```

or components render without styles.

**Solution:**

Ensure your `tailwind.config.js` includes the UI package:

```js
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@sundayhug/ui/src/**/*.{js,jsx,ts,tsx}", // ✅ Add this
  ],
};
```

### 2. Mixing Import Styles

**Problem:**

```tsx
// ❌ Don't mix these
import { Button } from "~/core/components/ui/button";
import { Input } from "@sundayhug/ui";
```

**Solution:**

Choose one import style and stick with it. We recommend the shared package:

```tsx
// ✅ Do this
import { Button, Input } from "@sundayhug/ui";
```

### 3. Missing Peer Dependencies

**Problem:**
```
Error: Cannot find module 'react'
Error: Cannot find module '@radix-ui/react-dialog'
```

**Solution:**

Install peer dependencies:

```bash
pnpm add react@^19.0.0 react-dom@^19.0.0
```

The package handles Radix UI dependencies internally.

### 4. CSS Import Issues

**Problem:**

Components render but don't have base styles (borders, paddings, etc.).

**Solution:**

Import the styles in your root layout:

```tsx
// app/root.tsx or app/layout.tsx
import "@sundayhug/ui/styles.css";
```

### 5. TypeScript Path Resolution

**Problem:**
```
Cannot find module '@sundayhug/ui' or its corresponding type declarations.
```

**Solution:**

Ensure your `tsconfig.json` is set up for the monorepo:

```json
{
  "compilerOptions": {
    "paths": {
      "@sundayhug/ui": ["../packages/ui/src"]
    }
  }
}
```

This is usually already configured in monorepos using pnpm workspaces.

### 6. Component Not Found

**Problem:**
```
Error: export 'MyComponent' (imported as 'MyComponent') was not found in '@sundayhug/ui'
```

**Possible causes:**

a) **Component is app-specific** - Check [Component Inventory](#component-inventory)
   - Solution: Keep using local import for app-specific components

b) **Component not exported** from `packages/ui/src/index.ts`
   - Solution: Check if component is properly exported in the package

c) **Typo in component name**
   - Solution: Check the correct component name in [COMPONENTS.md](./COMPONENTS.md)

### 7. Variant Types Don't Match

**Problem:**
```typescript
Type '"custom"' is not assignable to type '"default" | "destructive" | "outline" | ...
```

**Solution:**

The shared components have specific variants. Check the component documentation:
- [Button variants](./docs/button.md#variants)
- [Badge variants](./COMPONENTS.md#badge)
- etc.

If you need custom variants, extend the component locally or add them to the shared package.

## Rollback Strategy

If you encounter issues during migration, here's how to quickly rollback:

### Quick Rollback (Keep Old Files)

If you kept your old component files as backup:

```bash
# Restore old components
mv app/core/components/ui.backup app/core/components/ui

# Revert import changes
git checkout app/
```

### Git Rollback

If you committed changes to a feature branch:

```bash
# Check your commit history
git log --oneline

# Rollback to before migration
git reset --hard <commit-hash-before-migration>

# Or revert specific commits
git revert <migration-commit-hash>
```

### Partial Rollback

If only some components have issues:

```tsx
// Temporarily revert to old import for problematic components
import { Button } from "~/core/components/ui/button"; // Old import
import { Card, Input } from "@sundayhug/ui"; // New imports still work
```

This allows you to isolate and fix issues with specific components.

## Need Help?

If you encounter issues during migration:

1. **Check this guide** - Most common issues are documented above
2. **Review component documentation** - [COMPONENTS.md](./COMPONENTS.md)
3. **Check usage examples** - [docs/examples.md](./docs/examples.md)
4. **Consult the team** - Reach out on internal Slack/chat
5. **Create an issue** - Document the problem for others

## Migration Checklist

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] Package installed (`@sundayhug/ui` in dependencies)
- [ ] Tailwind config includes UI package content path
- [ ] Styles imported (`@sundayhug/ui/styles.css`)
- [ ] Created feature branch for migration
- [ ] Backed up current components

### During Migration
- [ ] Audited all components in current app
- [ ] Identified shared vs app-specific components
- [ ] Updated imports (component-by-component or batch)
- [ ] Ran TypeScript type check
- [ ] Ran build successfully
- [ ] Ran automated tests (if available)
- [ ] Manual smoke test completed
- [ ] Dark mode verified (if applicable)

### Post-Migration
- [ ] All components working as expected
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Tests passing
- [ ] Removed old component files
- [ ] Updated internal documentation
- [ ] Committed changes
- [ ] Deployed to staging
- [ ] QA testing completed
- [ ] Deployed to production

## Success Metrics

After successful migration, you should see:

✅ **Reduced Code Duplication**
- Removed ~15-25 component files from app
- Single source of truth in `@sundayhug/ui`

✅ **Improved Maintainability**
- Component updates in one place
- Bug fixes benefit all apps

✅ **Better Type Safety**
- Shared TypeScript types
- IntelliSense works consistently

✅ **Cleaner Imports**
- Single import statement for multiple components
- Shorter, more readable import paths

✅ **No Regressions**
- All features work as before
- No visual or behavioral changes
- All tests passing

## Conclusion

Migrating to `@sundayhug/ui` is a straightforward process that pays dividends in code quality, maintainability, and developer experience. The components are identical, so you can migrate with confidence!

**Key Takeaways:**
- ✅ Zero breaking changes - components are identical
- ✅ Gradual migration is safe and recommended
- ✅ Start with low-risk components
- ✅ Test thoroughly at each step
- ✅ Keep app-specific components local

Good luck with your migration! 🚀

---

**Questions or issues?** Refer to:
- [Complete Component Catalog](./COMPONENTS.md)
- [Usage Guide](./USAGE_GUIDE.md)
- [Real-World Examples](./docs/examples.md)
- [Individual Component Docs](./docs/)
