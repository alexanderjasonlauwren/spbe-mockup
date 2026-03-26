---
agent: "agent"
description: "Scaffold a new feature page in the admin dashboard following all project conventions"
---

# New Feature Page — Admin Dashboard

You are working in an internal admin dashboard for an Indonesian business (POS system). Scaffold a complete new feature page, following **all** project conventions below.

## Task

Create a new **${input:featureName}** feature with the following scope:
`${input:scope|list page with table and filters|list page|detail page|CRUD (list + form)|form page only}`

---

## Checklist — follow every step

### 1. Domain types

Create or extend `src/features/${input:domain}/types.ts` (or `src/types/` if shared):

- Define a TypeScript `interface` for the main entity (e.g., `interface Product { ... }`)
- Add a `Create${Entity}Dto` type for form payloads
- Reuse `ApiResponse<T>` and `PaginationParams` from `@/types/common`

### 2. API module

Create `src/features/${input:domain}/api/${input:domain}Api.ts`:

- Export one function per endpoint using `apiClient` from `@/lib/api`
- Example:

  ```ts
  import { apiClient } from "@/lib/api";
  import type { ApiResponse } from "@/types/common";
  import type { ${Entity} } from "../types";

  export const get${Entity}s = () =>
    apiClient.get<ApiResponse<${Entity}[]>>("/${input:domain}").then((r) => r.data.data);
  ```

### 3. Page component

Create `src/pages/${input:domain}/${input:pageName}Page.tsx`:

- Named export: `export function ${input:pageName}Page() {}`
- Use `PageHeader` for the page title
- Wrap in `<div className="space-y-6">`
- If it's a list page, include:
  - `useQuery` for data fetching
  - Loading state (`isLoading` skeleton or spinner)
  - shadcn `<Card>` with `<Table>` for the list
  - Search/filter bar using `<Input>` and `<Select>` from `@/components/ui/`
  - `<CanAccess>` gate on action buttons (Create/Edit/Delete)
- If it's a form page, include:
  - `react-hook-form` + `zodResolver`
  - Zod schema defined above the component
  - `useMutation` for submit
  - shadcn `Form` primitives throughout
  - `isPending` to disable submit button during submission

### 4. Styling rules (mandatory)

- All custom colors must have `dark:` counterparts
- Cards: `border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800`
- Headings: `text-gray-900 dark:text-white`
- Secondary text: `text-gray-600 dark:text-gray-400`
- Use `cn()` for conditional class merging
- Currency values: `formatCurrency(amount)` — never `"Rp " + amount`
- Icons: only `lucide-react`, typed as `LucideIcon`

### 5. RBAC gates

- Look up the relevant constants in `@/features/rbac/permissions`
- Wrap create/edit/delete buttons with `<CanAccess permission={PERMISSIONS.${input:domain|DOMAIN}_ACTION}>`
- Wrap the full page route with `<CanAccess>` if the domain requires it

### 6. Register the route

Add to `src/App.tsx` under the dashboard layout `children`:

```tsx
{
  path: "${input:domain}",
  element: <${input:pageName}Page />,
},
```

Import the page at the top of `App.tsx`.

### 7. Add sidebar entry

In `src/layouts/Sidebar.tsx`, add a navigation item entry for this route (nav icon from `lucide-react`, label and `href`).

---

## Output Format

Generate files in this order:

1. `src/features/${input:domain}/types.ts`
2. `src/features/${input:domain}/api/${input:domain}Api.ts`
3. `src/pages/${input:domain}/${input:pageName}Page.tsx`
4. Diff snippets for `src/App.tsx` and `src/layouts/Sidebar.tsx`

After generating, list any outstanding assumptions and ask for clarification.
