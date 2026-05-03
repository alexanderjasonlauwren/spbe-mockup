# SiDistrib — Enterprise Behaviour Refactor Plan

> **Purpose:** This document tracks every behavioral, architectural, and UX gap remaining in the codebase after the UI/stitch page rebuild. Items are ordered by priority (P1 = blocking production, P2 = enterprise requirement, P3 = polish). Each item includes exact files to touch and what to change.

---

## Gap Status Summary

| #   | Gap from gaps.md                  | Status                                                                                                                  | Priority |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| 4   | Authentication incomplete         | ⚠️ Partially addressed (Zustand persists, but login is mocked, no refresh tokens, no role redirect, no session timeout) | P1       |
| 5   | No global error boundary strategy | ⚠️ Route-level boundary exists; missing 403/500 interceptors, no toast, no component boundaries                         | P1       |
| 6   | No pagination / infinite scroll   | ⚠️ `PaginationParams` type exists; DataTable.tsx exists; NOT wired to any page or API call                              | P1       |
| 7   | No data export / print            | ❌ Still stub buttons everywhere                                                                                        | P2       |
| 8   | Monitoring page missing           | ✅ Resolved — MonitoringPage.tsx exists                                                                                 | —        |
| 9   | Notification page missing         | ✅ Resolved — NotificationPage.tsx exists                                                                               | —        |
| 10  | No real-time updates              | ❌ No `refetchInterval` anywhere                                                                                        | P2       |
| 11  | Feature modules empty stubs       | ✅ Mostly resolved — all core features have api/hooks/types                                                             | —        |
| 12  | Form UX incomplete                | ⚠️ EmptyState exists; no skeletons, no optimistic updates, no working drag-drop                                         | P2       |
| 13  | Settings page is stub             | ⚠️ Has branch data structure but missing: WhatsApp config, role management, SPBE master data                            | P2       |
| 14  | No audit trail / activity log     | ❌ Not implemented                                                                                                      | P3       |
| 15  | No mobile responsiveness testing  | ⚠️ MobileNav exists but tables/split panels unverified                                                                  | P3       |
| 16  | Dark mode inconsistency           | ⚠️ Some components hardcode light colors                                                                                | P2       |

---

## P1 — Production Blockers

### P1-A: Authentication — Real Login API + Role-Based Redirect

**Files to change:**

- `src/features/auth/store/authStore.ts`
- `src/lib/api.ts`
- `src/pages/auth/LoginPage.tsx`

**What to do:**

**1. Replace mock login with real API call** in `authStore.ts`:

```ts
// REMOVE the mock implementation
login: async (email, password) => {
  const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  const { user, token } = res.data;
  get().setUser(user, token);
},
```

**2. Add refresh token handling** in `src/lib/api.ts`:

```ts
// Store refresh token on login
localStorage.setItem("refresh_token", refreshToken);

// In the response interceptor, on 401:
// 1. Try POST /auth/refresh with the stored refresh token
// 2. On success: store new access token, retry the original request
// 3. On failure: logout + redirect to /login
// Use a flag (isRefreshing) and a queue to prevent parallel refresh storms
```

**3. Role-based redirect after login** in `LoginPage.tsx`:

```ts
const roleRedirectMap: Record<UserRole, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  finance: "/reports",
  driver: "/monitoring",
  staff: "/distribution",
  viewer: "/dashboard",
};
// After successful login: navigate(roleRedirectMap[user.role])
```

**4. Session timeout** — add to `authStore.ts`:

```ts
// On setUser(), schedule a setTimeout for token expiry (read exp from JWT)
// On expiry, call logout() automatically
// On user activity (mousemove/keydown), reset the timer (debounce 60s)
// Parse exp from JWT: JSON.parse(atob(token.split('.')[1])).exp
```

---

### P1-B: Global API Error Interceptor

**File:** `src/lib/api.ts`

**Current state:** 401 → logout + redirect. 403 and 5xx have no handling.

**Add to the response error interceptor:**

```ts
if (error.response?.status === 403) {
  // Don't logout — show a permission denied toast
  // Emit a custom event or call a toast store action
  window.dispatchEvent(new CustomEvent("api:forbidden"));
}
if (error.response?.status >= 500) {
  window.dispatchEvent(
    new CustomEvent("api:server-error", {
      detail: error.response?.data?.message,
    }),
  );
}
// 404 → toast "Data tidak ditemukan"
// 422 → let react-hook-form handle validation errors — pass through
```

**Add a global listener** in `src/App.tsx` or `src/layouts/DashboardLayout.tsx`:

```ts
useEffect(() => {
  const onForbidden = () =>
    toast.error("Anda tidak memiliki akses untuk tindakan ini.");
  const onServerError = (e: CustomEvent) =>
    toast.error(e.detail ?? "Server error. Coba lagi nanti.");
  window.addEventListener("api:forbidden", onForbidden);
  window.addEventListener("api:server-error", onServerError);
  return () => {
    /* removeEventListener */
  };
}, []);
```

---

### P1-C: Toast Notification System

**Install:** `sonner` (lightweight, works with Tailwind, shadcn-compatible)

```bash
npm install sonner
```

**Add `<Toaster>` to `src/main.tsx`** (or `App.tsx`):

```tsx
import { Toaster } from "sonner";
// Inside render:
<Toaster position="top-right" richColors />;
```

**Wire toast to:**

- All `useMutation` `onError` handlers: `toast.error(error.message)`
- All `useMutation` `onSuccess` handlers: `toast.success('Berhasil disimpan')`
- API interceptor custom events (P1-B above)
- Export stubs: `toast.info('Fitur export akan segera hadir')`
- Form submit success: `toast.success('Data berhasil disimpan')`

**File updates:**

- `src/features/sa/hooks/useScheduleAgreement.ts` — add toast to onSuccess/onError
- `src/features/payment/hooks/usePayment.ts` — add toast to verification mutations
- `src/features/distribution/hooks/useDistributionPlan.ts` — add toast on plan save/confirm
- Any other feature hook with `useMutation`

---

### P1-D: Pagination — Wire DataTable to Server-Side Pagination

**Files:**

- `src/components/common/DataTable.tsx` — verify it accepts pagination props
- Every feature's `api/*.ts` file — add page/limit params
- Every page that renders a table

**Step 1 — Create `usePagination` hook** at `src/hooks/usePagination.ts`:

```ts
export function usePagination(initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const reset = () => setPage(1);
  return { page, pageSize, setPage, setPageSize, reset };
}
```

**Step 2 — Update `DataTable.tsx`** to accept:

```ts
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyState?: ReactNode;
}
```

**Step 3 — Update each feature API** to accept `PaginationParams`:

```ts
// Example: src/features/sa/api/saApi.ts
export async function getSAList(params: PaginationParams) {
  return apiClient.get("/sa", { params }).then((r) => r.data);
}
```

**Step 4 — Update each page** to wire `usePagination` → API → `DataTable`:

```ts
const { page, pageSize, setPage } = usePagination();
const { data, isLoading } = useQuery({
  queryKey: ["sa", page, pageSize],
  queryFn: () => getSAList({ page, limit: pageSize }),
});
```

**Pages to update:**

- `SAManagementPage.tsx`
- `PaymentPage.tsx`
- `MonitoringPage.tsx` (table section)
- `ReportsPage.tsx` (reconciliation table)
- `DistributionPage.tsx`
- `UserListPage.tsx`
- `PangkalanListPage.tsx`

---

## P2 — Enterprise Requirements

### P2-A: Loading Skeletons

**Create** `src/components/common/SkeletonCard.tsx` and `src/components/common/SkeletonTable.tsx`:

```tsx
// SkeletonCard — for KPI cards
export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-surface-low p-6 space-y-3">
      <div className="h-3 w-24 rounded bg-outline-variant/30" />
      <div className="h-8 w-32 rounded bg-outline-variant/30" />
    </div>
  );
}

// SkeletonTable — for data tables
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (/* table structure with animate-pulse cells */);
}
```

**Wire in each page:**

```tsx
if (isLoading)
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <SkeletonCard key={i} />
        ))}
    </div>
  );
```

**Files to update:** DashboardPage, SAManagementPage, MonitoringPage, PaymentPage, ReportsPage.

---

### P2-B: Real-Time Updates (TanStack Query `refetchInterval`)

**File per feature hook:**

| Hook file                     | queryKey                  | refetchInterval  |
| ----------------------------- | ------------------------- | ---------------- |
| `useMonitoring.ts`            | `['monitoring']`          | `30_000` (30s)   |
| `useDashboard.ts`             | `['dashboard']`           | `60_000` (1 min) |
| `useNotification.ts`          | `['notifications']`       | `30_000`         |
| `usePayment.ts` (pending tab) | `['payments', 'pending']` | `60_000`         |

**Add a "Last updated" indicator** in MonitoringPage:

```tsx
// From useQuery: dataUpdatedAt (timestamp number)
<span className="text-xs text-on-surface-variant">
  Diperbarui: {formatDateTime(new Date(dataUpdatedAt))}
</span>
```

---

### P2-C: Data Export (CSV + PDF)

**Install:**

```bash
npm install jspdf jspdf-autotable papaparse
npm install -D @types/papaparse
```

**Create utility** `src/lib/export.ts`:

```ts
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
): void {
  const doc = new jsPDF();
  doc.text(title, 14, 16);
  autoTable(doc, { head: [columns], body: rows, startY: 22 });
  doc.save(`${filename}.pdf`);
}
```

**Wire export buttons:**

- `ReportsPage.tsx` → Export PDF/Excel buttons → `exportToPDF()` / `exportToCSV()` with reconciliation data
- `SAManagementPage.tsx` → Export → SA table data
- `MonitoringPage.tsx` → Export PDF → monitoring table data
- `DashboardPage.tsx` → Export Laporan → activity table data

---

### P2-D: Settings Page — Full Domain Configuration

**File:** `src/pages/settings/SettingsPage.tsx`

**Sections to implement** (tabbed layout using shadcn `Tabs`):

| Tab                       | Content                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Profil Perusahaan**     | Company name, address, phone, NPWP, logo upload                                                  |
| **Manajemen User**        | Table of users + roles. Add/Edit/Deactivate. `<CanAccess permission={PERMISSIONS.USERS_MANAGE}>` |
| **SPBE & Pangkalan**      | Master data tables for SPBE partners and pangkalan list. CRUD forms                              |
| **Driver**                | Driver list with vehicle info, SIM expiry, status. Link to DriverPage                            |
| **Notifikasi & WhatsApp** | WhatsApp API config (reuse `WhatsAppApiConfig` component from Notification page)                 |
| **Tampilan**              | Theme toggle (dark/light), language selector (id/en stub)                                        |

**Gate entire settings page:**

```tsx
<CanAccess permission={PERMISSIONS.SETTINGS_VIEW}>
  <SettingsPage />
</CanAccess>
```

---

### P2-E: Dark Mode Audit & Fix

**Run this search to find hardcoded light colors:**

```bash
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" src/pages/ src/features/ --include="*.tsx" | grep -v "dark:"
```

**Fix pattern:** Every `bg-white` must have `dark:bg-dark-800` or `dark:bg-card`. Every `text-gray-900` must have `dark:text-white`. Every `border-gray-200` must have `dark:border-dark-700`.

**Priority files (most likely offenders based on component review):**

- `src/pages/payments/PaymentPage.tsx`
- `src/pages/sa/SAManagementPage.tsx`
- `src/pages/distribution/DistributionPage.tsx`
- `src/features/payment/components/PaymentCard.tsx`
- `src/features/distribution/components/PlanDetailPanel.tsx`

---

### P2-F: Empty States — Wire to All Tables

`EmptyState.tsx` already exists. Wire it:

```tsx
// In DataTable or inline in each page:
if (!isLoading && data.length === 0) {
  return (
    <EmptyState
      icon={FileText}
      title="Belum ada data"
      description="Data akan muncul di sini setelah ditambahkan."
    />
  );
}
```

**Tables to update:** SA table, Payment list, Distribution plan list, Monitoring table, Reconciliation table.

---

### P2-G: Optimistic Updates — Payment Verification

**File:** `src/features/payment/hooks/usePayment.ts`

```ts
const queryClient = useQueryClient();
const verifyMutation = useMutation({
  mutationFn: (id: string) =>
    apiClient.patch(`/payments/${id}/verify`).then((r) => r.data),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["payments"] });
    const previous = queryClient.getQueryData(["payments"]);
    queryClient.setQueryData(["payments"], (old: Payment[]) =>
      old.map((p) => (p.id === id ? { ...p, status: "Terverifikasi" } : p)),
    );
    return { previous };
  },
  onError: (_err, _id, ctx) => {
    queryClient.setQueryData(["payments"], ctx?.previous);
    toast.error("Verifikasi gagal. Coba lagi.");
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    toast.success("Pembayaran berhasil diverifikasi.");
  },
});
```

---

## P3 — Polish & Compliance

### P3-A: Audit Trail / Activity Log

**New feature module:** `src/features/audit/`

**API shape:**

```ts
interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // "VERIFY_PAYMENT" | "CONFIRM_PLAN" | "UPLOAD_SA" | etc.
  resource: string; // "Payment" | "DistributionPlan" | "SA"
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

**Where to log (client-side POST to `/audit`):** inside `onSuccess` of every critical mutation:

- Payment verify / reject
- SA upload and status change
- Distribution plan confirm
- User role changes

**New route:** `/settings` → "Riwayat Aktivitas" tab showing paginated `AuditLog` table.

**Gate:** `<CanAccess permission={PERMISSIONS.AUDIT_VIEW}>` — admin/manager only.

---

### P3-B: Mobile Responsiveness Fixes

**Breakpoint audit for these layouts (use browser DevTools at 375px, 768px):**

| Component                          | Issue                                 | Fix                                                                              |
| ---------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `DistributionPage.tsx` split panel | Collapses poorly on mobile            | Stack panels vertically below `md:` — left panel becomes a drawer or collapsible |
| `NotificationPage.tsx` split panel | Same issue                            | Stack below `lg:`                                                                |
| All data tables                    | Horizontal scroll needed on mobile    | Wrap in `<div className="overflow-x-auto">`                                      |
| KPI card grids                     | `grid-cols-4` breaks at small screens | Change to `grid-cols-2 md:grid-cols-4`                                           |
| Bottom bar in DistributionPage     | Overlaps content on mobile            | Add `pb-20` to the scrollable area                                               |

---

### P3-C: Component-Level Error Boundaries

**Create** `src/components/common/ErrorBoundaryWrapper.tsx`:

```tsx
// React class component ErrorBoundary with fallback UI
// Wrap each major section (charts, tables) independently
// so one failed section doesn't crash the whole page
```

**Usage:**

```tsx
<ErrorBoundaryWrapper fallback={<Alert>Gagal memuat grafik</Alert>}>
  <MonthlyBarChart />
</ErrorBoundaryWrapper>
```

**Wrap in:** DashboardPage (charts), ReportsPage (charts + table), MonitoringPage (map section).

---

## Implementation Order

```
Sprint 1 (Week 1) — P1 Blockers
  ├── P1-C: Install sonner, add Toaster, wire to existing mutations
  ├── P1-B: Add 403/500 interceptors to api.ts
  ├── P1-D: Create usePagination, update DataTable props, wire to SAManagementPage first
  └── P1-A: Replace mock login (when backend /auth/login is ready)

Sprint 2 (Week 2) — Core UX
  ├── P2-A: Create SkeletonCard + SkeletonTable, wire to all pages
  ├── P2-B: Add refetchInterval to monitoring and dashboard hooks
  ├── P2-F: Wire EmptyState to all tables
  └── P2-G: Add optimistic update to payment verification

Sprint 3 (Week 3) — Enterprise Features
  ├── P2-C: Implement exportToCSV + exportToPDF utility, wire to all export buttons
  ├── P2-D: Build out full Settings page with all tabs
  └── P2-E: Dark mode audit + fix all missing dark: variants

Sprint 4 (Week 4) — Polish
  ├── P3-A: Audit trail feature module + UI in settings
  ├── P3-B: Mobile responsiveness fixes for split panels and tables
  └── P3-C: Component-level error boundaries on charts and map
```

---

## Files NOT to Touch

| File                               | Reason                                     |
| ---------------------------------- | ------------------------------------------ |
| `src/components/ui/*`              | shadcn primitives — upgrade via CLI only   |
| `src/features/rbac/permissions.ts` | Permissions already comprehensive          |
| `src/lib/utils.ts`                 | Utilities complete — only extend if needed |
| `src/types/common.ts`              | Core types stable                          |

---

## New Files to Create (not currently in codebase)

| File                                                         | Purpose                         |
| ------------------------------------------------------------ | ------------------------------- |
| `src/hooks/usePagination.ts`                                 | P1-D pagination hook            |
| `src/lib/export.ts`                                          | P2-C CSV + PDF export utilities |
| `src/components/common/SkeletonCard.tsx`                     | P2-A loading skeleton           |
| `src/components/common/SkeletonTable.tsx`                    | P2-A loading skeleton           |
| `src/components/common/ErrorBoundaryWrapper.tsx`             | P3-C component boundaries       |
| `src/features/audit/api/auditApi.ts`                         | P3-A audit log API              |
| `src/features/audit/types.ts`                                | P3-A AuditLog type              |
| `src/features/notification/components/WhatsAppBlastForm.tsx` | Stitch page 7                   |
| `src/features/notification/components/WhatsAppApiConfig.tsx` | Stitch page 7                   |
