# Admin Dashboard — Copilot Workspace Instructions

## Project Overview

Internal admin dashboard (POS) for Indonesian businesses. React + TypeScript (Vite), with RBAC, dark/light mode, and IDR (Indonesian Rupiah) currency formatting.

---

## Tech Stack

| Layer         | Library / Version                                          |
| ------------- | ---------------------------------------------------------- |
| UI framework  | React 19 + TypeScript, Vite 7                              |
| Routing       | React Router v7 (`createBrowserRouter`)                    |
| Styling       | Tailwind CSS v3 — dark mode via `dark` class on `<html>`   |
| UI primitives | shadcn/ui (Radix-based) in `src/components/ui/`            |
| Global state  | Zustand v5 (auth, persisted to `localStorage`)             |
| Server state  | @tanstack/react-query v5                                   |
| HTTP client   | axios — `src/lib/api.ts`                                   |
| Charts        | Recharts v3                                                |
| Forms         | react-hook-form v7 + zod v4 + @hookform/resolvers          |
| Icons         | lucide-react (only)                                        |
| Class helpers | `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts` |

---

## Directory Layout

```
src/
  pages/          # Route-level page components, one sub-folder per domain
  layouts/        # Shared layout shells (DashboardLayout, Sidebar, Header, MobileNav)
  features/       # Domain feature modules
    auth/         # store/authStore.ts, components/ProtectedRoutes.tsx
    rbac/         # permissions.ts, components/CanAccess.tsx
  components/
    ui/           # shadcn/ui primitives — do NOT modify these directly
    common/       # Reusable app-level components (PageHeader, StatsCard)
    charts/       # Recharts wrapper components
  lib/
    api.ts        # axios instance with auth interceptor
    utils.ts      # cn(), formatCurrency(), formatDate()
  types/
    auth.ts       # User, UserRole, AuthResponse
    common.ts     # ApiResponse<T>, PaginationParams
  hooks/          # Custom React hooks
```

---

## Coding Conventions

### Components

- **Named exports** only: `export function MyComponent() {}`
- Props typed with TypeScript `interface`: `interface MyComponentProps { ... }`
- Page files: `src/pages/<domain>/<PageName>Page.tsx`
- Import path alias: `@/` → `src/`

### Styling & Theming

- Combine classes with `cn()` from `@/lib/utils`
- **Always** add `dark:` variants alongside any custom color class
- Prefer shadcn semantic tokens over raw Tailwind colors:
  - Background: `bg-background` / `bg-card`
  - Text: `text-foreground` / `text-muted-foreground`
  - Border: `border-border`
- Standard card pattern:
  ```tsx
  <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
  ```
- Standard text pattern:
  - Headings: `text-gray-900 dark:text-white`
  - Muted / labels: `text-gray-600 dark:text-gray-400`

### Icons

- Import only from `lucide-react`
- Type icon props as `icon: LucideIcon`

### Currency

- Always use `formatCurrency(amount)` from `@/lib/utils` — outputs IDR, locale `id-ID`, no decimals
- Never concatenate `"Rp "` manually

### RBAC

- Gate UI elements with `<CanAccess permission={PERMISSIONS.RESOURCE_ACTION}>`
- Import constants from `@/features/rbac/permissions`
- Use `useAuthStore().hasPermission()` / `.hasRole()` for imperative logic
- Client-side gating hides UI only — the backend must enforce permissions too

### Forms

- Use `react-hook-form` with `zodResolver`
- Define the zod schema in the same file or sibling `schema.ts`
- Use shadcn form primitives: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`

### API & Server State

- Use `apiClient` from `@/lib/api.ts` for all HTTP calls
- Use `@tanstack/react-query` (`useQuery`, `useMutation`) for all server state
- Centralize domain API calls in `src/features/<domain>/api/`

### Routing

- Register every new page in `src/App.tsx` under the dashboard layout children
- Add a sidebar entry in `src/layouts/Sidebar.tsx` for navigable pages
- Auth guard is already applied at layout level via `<ProtectedRoute>`
- For permission-restricted pages, apply `<CanAccess>` or redirect at the route or page level

### Types

- Shared / cross-domain types: `src/types/`
- Domain-specific types: co-locate in `src/features/<domain>/` or alongside the component
- Use `ApiResponse<T>` and `PaginationParams` from `src/types/common.ts` for API shapes

### Error Handling

- Inline errors: shadcn `<Alert>` component
- Mutation feedback: toast (when integrated)
- Unhandled routes → `<NotFoundPage />`, runtime errors → `<ErrorBoundary />`

---

## Key Patterns

### Page skeleton

```tsx
import { PageHeader } from "@/components/common/PageHeader";

export function ExampleListPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Example" description="Manage examples." />
      {/* content */}
    </div>
  );
}
```

### StatsCard

```tsx
import { StatsCard } from "@/components/common/StatsCard";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

<StatsCard
  title="Total Revenue"
  value={formatCurrency(12500000)}
  change="12% vs last month"
  changeType="positive"
  icon={DollarSign}
/>;
```

### CanAccess gate

```tsx
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";

<CanAccess permission={PERMISSIONS.USERS_CREATE}>
  <Button>Add User</Button>
</CanAccess>;
```

### React Query fetch

```tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types/common";

const { data, isLoading } = useQuery({
  queryKey: ["products"],
  queryFn: () =>
    apiClient.get<ApiResponse<Product[]>>("/products").then((r) => r.data.data),
});
```

### React Query mutation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
const { mutate, isPending } = useMutation({
  mutationFn: (payload: CreateProductDto) =>
    apiClient.post("/products", payload).then((r) => r.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

---

## Things to Avoid

- Do not hard-code black/white text — always pair with `dark:` counterpart
- Do not use raw color values like `#fff` or inline `style` for theming
- Do not store sensitive data beyond what's needed in Zustand/localStorage
- Do not modify files in `src/components/ui/` (shadcn primitives) unless upgrading shadcn
- Do not mock auth or skip `<CanAccess>` guards in production code paths
- Do not use `$` or manual currency strings — always use `formatCurrency()`
