# Admin Dashboard (POS Internal) — Project Status & Tech Debt (as of 2026-03-07)

This document summarizes what has been implemented so far, how the project is structured, what conventions we followed, and the remaining work / tech debt to make it production-ready.

> Target: Internal admin dashboard for Indonesian business use-cases (currency in IDR), responsive (mobile + desktop), with RBAC and dark/light mode.

---

## 1) Tech Stack

### Core

- **React + TypeScript** (Vite)
- **React Router v6** (route-based layout, guarded routes)
- **Tailwind CSS** (Tailwind v3 style setup with `@tailwind base/components/utilities`)
- **shadcn/ui** components (Radix-based primitives)
- **Zustand** (auth state, persisted)
- **Recharts** (dummy charts on dashboard)

### Form & Validation

- **react-hook-form**
- **zod**
- **@hookform/resolvers**

### Utilities

- `clsx` + `tailwind-merge` (via `cn()` helper)
- `axios` client stub (prepared, not fully integrated)

---

## 2) Key Features Implemented

### 2.1 Routing & Layout

- App uses a dashboard layout with:
  - **Sidebar**: desktop + mobile, supports **collapsed** mode on desktop.
  - **Header**: search input, notifications badge, theme toggle.
  - **MobileNav**: bottom nav for mobile usage (optional).

### 2.2 Authentication (Mock)

- Auth is currently **mocked** in Zustand:
  - Any credential logs in.
  - Stores `user`, `token`, `isAuthenticated`.
  - Token stored in `localStorage` (`auth_token`).

### 2.3 RBAC (Role Based Access Control)

- Implemented:
  - `PERMISSIONS` constants (string-based)
  - `CanAccess` component for permission gating in UI
  - Route-level protection:
    - `ProtectedRoute` checks `isAuthenticated`
    - (Optional/partial) role guard pattern exists in earlier iterations; ensure it’s consistent if used.

### 2.4 Dark Mode / Light Mode

- Dark mode toggled by adding `dark` class on `<html>`.
- Theme stored in `localStorage`.
- Many components have been patched with `dark:` classes for readability.

> Note: dark mode still has edge-cases (see Tech Debt).

### 2.5 Currency Localization (Indonesia / IDR)

- `formatCurrency()` uses:
  - locale `id-ID`
  - currency `IDR`
  - no decimals
- Replaced `$` values on dashboard & reports with IDR formatting.

### 2.6 Dashboard Page

- Contains:
  - Summary **Stats cards**
  - 2 charts:
    - Line chart (revenue)
    - Bar chart (category sales)
  - Recent orders list with status badges

### 2.7 Reports Page (Dummy)

- Reports page includes:
  - Summary cards
  - Table with:
    - search filter
    - category filter
    - status filter
    - sortable columns
- Dark mode styling has been improved but still needs polish.

### 2.8 Product Submenu + Product Create Form

- Sidebar: `Products` has submenu:
  - `Product List`
  - `Add Product` (`/products/new`)
- `ProductFormPage` includes:
  - basic info
  - pricing & inventory
  - category & status
  - image upload preview (local only)
  - zod validation + react-hook-form
  - mock submit flow

### 2.9 Error Handling (404 / Error Boundary)

- Implemented:
  - `NotFoundPage` for 404s
  - `ErrorBoundary` for route errors

---

## 3) Project Structure (Current Direction)

High-level directories (actual may vary slightly depending on local changes):

- `src/layouts/`
  - `DashboardLayout.tsx` (sidebar + header + outlet)
  - `Sidebar.tsx`
  - `Header.tsx`
  - `MobileNav.tsx`

- `src/pages/`
  - `dashboard/DashboardPage.tsx`
  - `reports/ReportsPage.tsx`
  - `products/ProductListPage.tsx` (placeholder)
  - `products/ProductFormPage.tsx`
  - `users/UserListPage.tsx` (placeholder)
  - `orders/OrderListPage.tsx` (placeholder)
  - `settings/SettingsPage.tsx` (placeholder)
  - `auth/LoginPage.tsx`
  - `errors/NotFoundPage.tsx`
  - `errors/ErrorBoundary.tsx`

- `src/features/`
  - `auth/store/authStore.ts`
  - `auth/components/ProtectedRoute.tsx`
  - `rbac/permissions.ts`
  - `rbac/components/CanAccess.tsx`

- `src/components/common/`
  - `PageHeader.tsx`
  - `StatsCard.tsx`

- `src/lib/`
  - `api.ts` (axios client)
  - `utils.ts` (cn, formatCurrency, formatDate, etc.)
  - `config.ts` (optional typed env helper if present)

- `src/hooks/`
  - `useTheme.ts`

---

## 4) Known Issues / Tech Debt (Must Fix Before Production)

### 4.1 Visual Design System & Theming

- **Problem**: Styling is currently “patched” component-by-component with `dark:` classes.
- **Goal**: Centralize theme tokens:
  - Prefer shadcn default token approach (`bg-background`, `text-foreground`, `border-border`, etc.).
  - Define theme via CSS variables (shadcn approach) rather than hard-coded `dark:*` everywhere.
- **Action**:
  - Ensure `globals.css` defines CSS variables for both themes.
  - Refactor UI to use semantic Tailwind classes like:
    - `bg-background text-foreground`
    - `text-muted-foreground`
    - `border-border`
  - Reduce custom `dark:` overrides.

### 4.2 Data Table Componentization

- Reports table is page-local logic:
  - sorting/filter logic inline
  - header clickable divs inline
- **Action**:
  - Create reusable `<DataTable />`:
    - column config
    - sorting
    - filtering
    - pagination
    - row actions menu
  - Consider TanStack Table for production-grade tables.

### 4.3 Auth & Session Management

- Current auth is mock + `localStorage`.
- **Action**:
  - Implement real auth with secure approach:
    - Prefer **httpOnly cookies** for session token.
  - Add:
    - token refresh strategy (if JWT)
    - logout invalidation
    - `me` endpoint fetch at boot
  - Add proper redirects and persist only what is needed.

### 4.4 RBAC Source of Truth

- RBAC is on the client; must align with backend:
  - Permissions must come from backend reliably.
- **Action**:
  - Server should enforce RBAC too.
  - Client should only _hide UI_; not be the security gate.
  - Add typed `Permission` union and prevent typos.
  - Add route-level permission guards (not only menu hiding).

### 4.5 Accessibility & UX Polish

- Issues observed:
  - status badge aesthetics and contrast need consistency across pages
  - hover states occasionally look inconsistent (especially in dark mode)
- **Action**:
  - Ensure contrast meets WCAG AA.
  - Focus states for keyboard navigation.
  - Proper aria labels on icon buttons (notifications, collapse, theme toggle).

### 4.6 Charts Dark Mode

- Recharts tooltip and grid lines need consistent theming.
- **Action**:
  - Provide a custom tooltip component for light/dark.
  - Use theme tokens for chart colors.

### 4.7 Sidebar Collapse Behavior

- Collapse button had some bugs when collapsed.
- **Action**:
  - Ensure collapse toggle is always clickable and visually consistent.
  - Ensure submenu behavior in collapsed mode is defined:
    - either disable submenu expansion or show popover on hover/click.

### 4.8 Environment & Config

- Vite env typing needed:
  - `src/vite-env.d.ts` should exist.
- `.env.example` exists (should be kept updated).
- **Action**:
  - Add `.env.production`, `.env.development` usage guidance.
  - Validate required env vars at startup (fail fast).

### 4.9 API Layer & Data Fetching

- `axios` client exists but data is mocked in pages.
- **Action**:
  - Add `@tanstack/react-query` everywhere for server state:
    - list products/orders/users
    - create product
  - Centralize API modules per domain.

### 4.10 Testing & Quality Gates

- No tests added yet.
- **Action**:
  - Unit tests: Vitest + React Testing Library
  - E2E: Playwright
  - Add lint rules for:
    - import boundaries
    - unused vars
    - consistent hooks usage
  - Add CI pipeline.

### 4.11 Error Handling & Observability

- There is an ErrorBoundary + NotFound page.
- **Action**:
  - Add toast system for user-facing errors.
  - Add structured logging / monitoring (Sentry etc.).
  - Handle API errors gracefully (403 -> show permission error, not generic).

### 4.12 Performance

- **Action**:
  - Lazy load routes (React `lazy` + Suspense)
  - Memoize heavy components (charts/tables) if needed
  - Virtualize large lists/tables (TanStack Virtual)

---

## 5) Coding Conventions / Notes for Next Developer

### 5.1 Tailwind + shadcn

- Prefer semantic tokens (shadcn) rather than hard-coded colors when possible.
- Keep dark mode support as first-class.

### 5.2 Formatting Currency

- Use `formatCurrency(number)` for any money display.
- Avoid manual `"Rp "` concatenation.

### 5.3 RBAC

- Use `<CanAccess permission="...">` to hide features.
- Still enforce permissions on backend.

### 5.4 Router

- Every new page should:
  - be registered under routes
  - have a route guard if needed
  - have a sidebar entry if needed

---

## 6) Recommended Next Steps (Roadmap)

1. **Stabilize theming**
   - adopt shadcn CSS variables fully
   - refactor to semantic tokens

2. **Real auth integration**
   - login/logout/me flows
   - secure token storage

3. **API + React Query**
   - replace mock data on dashboard and reports with real data

4. **Production-grade table**
   - TanStack Table + pagination + server-side filters

5. **Complete CRUD**
   - Users, Orders, Products + Settings pages

6. **CI + tests**
   - lint, typecheck, unit tests, E2E tests

---

## Appendix A: Environment Example

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api

# App Configuration
VITE_APP_TITLE=Admin Dashboard

# Feature Flags (optional)
# VITE_ENABLE_ANALYTICS=false
```

---

## Appendix B: Known Visual Bugs Reported During Iteration

- Some text/icons remained black in dark mode (missing `dark:text-*` or semantic tokens).
- Sidebar collapse toggle positioning issues.
- Reports table header/filter section looked overlapping/untidy due to nested buttons and spacing.
- Some buttons (Export, Date Range) had black text in dark mode in certain variants.

These have been patched incrementally but should be resolved properly by adopting semantic theme tokens.
