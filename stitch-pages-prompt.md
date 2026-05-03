# SiDistrib — Stitch-to-React Page Implementation Prompt

> **Purpose:** This is a single, comprehensive agent prompt to rebuild all SiDistrib dashboard pages from the Stitch HTML designs to pixel-faithful React + TypeScript + Tailwind components. Paste this entire file as the instruction to a new AI agent session.

---

## Context & Codebase Constraints

You are implementing pages for **SiDistrib**, an Indonesian LPG distribution management system dashboard. The codebase lives at `src/` under:

- **Framework:** React 19 + TypeScript + Vite 7
- **Routing:** React Router v7 (`createBrowserRouter`)
- **Styling:** Tailwind CSS v3, `darkMode: 'class'`, always add `dark:` variants
- **UI Primitives:** shadcn/ui (Radix-based) in `src/components/ui/` — do NOT modify these
- **State:** Zustand v5 (`src/features/auth/store/authStore.ts`)
- **Server State:** `@tanstack/react-query` v5
- **HTTP:** `apiClient` from `src/lib/api.ts`
- **Charts:** Recharts v3
- **Forms:** react-hook-form v7 + zod v4
- **Icons:** `lucide-react` only
- **Class Helper:** `cn()` from `src/lib/utils.ts`
- **Currency:** Always `formatCurrency(amount)` from `src/lib/utils.ts` (IDR, no decimals)
- **RBAC:** Wrap restricted UI with `<CanAccess permission={PERMISSIONS.X}>` from `src/features/rbac`
- **Path alias:** `@/` → `src/`
- **Exports:** Named exports only — `export function PageName() {}`
- **Props:** Typed with TypeScript `interface`

---

## Design System — "Pilar Utama Blue"

Apply these tokens globally. Never use raw hex or hardcoded colors inline.

### Color Tokens (add to `tailwind.config.js` under `theme.extend.colors`)

```
primary:          #004d99   (deep navy blue — primary brand)
primary-container: #1565c0  (mid blue — hover states, highlights)
on-primary:       #ffffff
surface:          #f7f9fc   (page canvas background)
surface-low:      #f2f4f7   (secondary panel/section background)
surface-lowest:   #ffffff   (card / "popped" content)
on-surface:       #191c1e   (primary text — NOT pure black)
on-surface-variant: #424752 (secondary/muted text)
outline-variant:  #c2c6d4   (ghost borders — 15% opacity only)
sidebar-bg:       #1A2744   (dark navy sidebar)
error:            #ba1a1a
tertiary:         #813900   (amber/warning)
success:          #10b981   (emerald green)
```

### Design Principles

- **No-Line Rule:** Never use `border` to section content. Use background color shifts between `surface`, `surface-low`, and `surface-lowest`.
- **Tonal Layering:** Cards on `surface-low` bg → use `bg-white` card. Sections on `surface` → use `bg-surface-low` blocks.
- **Shadow:** Floating elements use `shadow-[0_12px_32px_rgba(13,27,55,0.08)]`. Cards use no shadow — rely on bg contrast.
- **Ghost Border:** If a separator is absolutely necessary: `border-outline-variant/15`.
- **Primary CTA Gradient:** `bg-gradient-to-br from-[#004d99] to-[#1565c0]` at 135°.
- **Button hover:** increase gradient intensity; `active:scale-[0.98]`.
- **Status Chips:** Pill shape. Background = status-color at 10% opacity. Text = status-color full opacity, bold.
  - Selesai/Lunas → emerald `bg-emerald-100 text-emerald-700`
  - Proses/Aktif → blue `bg-blue-100 text-blue-700`
  - Pending/Draft → amber `bg-amber-100 text-amber-700`
  - Error/Belum → red `bg-red-100 text-red-700`
- **Table Rules:** No vertical lines. Alternating rows with `even:bg-surface-low`. Headers: uppercase `text-xs tracking-widest text-on-surface-variant`.
- **Input Fields:** `bg-[#e0e3e6]` fill, `border-b-2 border-transparent focus:border-primary`.
- **Typography:** Inter font. KPI values use `text-4xl font-bold tracking-tight`. Module titles `text-lg font-semibold`. Table data `text-sm`.
- **Spacing:** `gap-6` between major modules. `p-6` inside cards.

---

## Pages to Implement

Implement ALL pages below. Each section specifies exact file paths, components to build or update, and the complete UI spec from the Stitch design.

---

### Page 1 — Beranda (Dashboard)

**File:** `src/pages/dashboard/DashboardPage.tsx`
**Route:** `/dashboard`

**Rebuild to match this layout:**

```
┌─────────────────────────────────────────────────────────┐
│ PageHeader: "Dashboard" + "Export Laporan" button (stub) │
├──────────┬──────────┬──────────┬──────────────────────── │
│ KPI Card │ KPI Card │ KPI Card │ KPI Card                │
│ Distribusi│ Sisa    │ Pangkalan│ Pembayaran               │
│ Hari Ini │ Kuota   │ Aktif    │ Pending                  │
├──────────┴──────────┴──────────┴──────────────────────── │
│ ┌─────────────────────────────┐  ┌──────────────────────┐│
│ │ Progres Distribusi Bulanan  │  │ Distribusi per        ││
│ │ (Recharts BarChart, 5 weeks)│  │ Wilayah (PieChart     ││
│ │ Tab months: Oct / Sep       │  │ donut, 3 segments)    ││
│ └─────────────────────────────┘  └──────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ Aktivitas Distribusi (table)                            │
│ Cols: No | Tanggal | Pangkalan | Driver | Tabung | Status│
│ Pagination (5 rows/page)                                 │
└─────────────────────────────────────────────────────────┘
```

**KPI Cards — exact data shape:**

```ts
interface KpiData {
  title: string; // e.g. "Distribusi Hari Ini"
  value: string; // e.g. "1.284 tabung"
  change?: string; // e.g. "+12% dari kemarin"
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}
```

- Card 1: `Package` icon, primary blue top-border
- Card 2: `Archive` icon, amber top-border
- Card 3: `MapPin` icon, emerald top-border
- Card 4: `CreditCard` icon, red top-border (warning state)

**Charts:**

- Bar chart: mock data for 5 weeks (W1–W5), single bar in `#1565c0`, `CartesianGrid` with `stroke="#c2c6d4" strokeOpacity={0.3}`, custom tooltip with `formatCurrency`
- Donut chart: 3 segments (Jak-Sel 70% `#1565c0`, Jak-Pus 25% `#f59e0b`, Lainnya 5% `#10b981`), centered label showing total
- Month tab selector above bar chart

**Activity Table:**

```ts
interface ActivityRow {
  id: string;
  tanggal: string;
  pangkalan: string;
  driver: string;
  jumlahTabung: number;
  status: "Selesai" | "Dalam Perjalanan" | "Loading" | "Pending";
}
```

- 10 mock rows, paginated 5/page using local state
- StatusBadge component for status column
- `formatDate(tanggal)` for date column

**Export button:** renders a `Button` with `Download` icon. `onClick` shows a toast "Fitur export akan segera hadir" (toast not yet wired — just console.log for now, will be wired in behavior phase).

---

### Page 2 — Schedule Agreement

**File:** `src/pages/sa/SAManagementPage.tsx`
**Feature files:** `src/features/sa/` (api, components, hooks, types already exist — align with them)

**Rebuild to match this layout:**

```
┌─────────────────────────────────────────────────────────┐
│ PageHeader: "Schedule Agreement"                         │
│ Actions: [Upload SA Baru ▼ (gradient)] [Riwayat SA]     │
├─────────────────────────────┬───────────────────────────┤
│ Filter Bar:                 │                           │
│ [Bulan ▼] [Tahun ▼] [Status▼]                          │
├─────────────────────────────┴───────────────────────────┤
│ DATA TABLE                                              │
│ Cols: No SA | SPBE | Periode | Total Kuota |            │
│       Didistribusikan | Sisa Kuota (progress) |         │
│       Status | Aksi                                     │
├──────────────────────────┬──────────────────────────────┤
│ UPLOAD FORM              │ INFO CARDS                   │
│ - Input: No SA           │ - Sisa Kuota Global (large   │
│ - Dropdown: SPBE         │   gradient card, primary)    │
│ - Date: Periode          │ - Panduan SA (numbered list) │
│ - Number: Total Kuota    │                              │
│ - Textarea: Catatan      │                              │
│ - File dropzone          │                              │
│ [Reset] [Simpan SA]      │                              │
└──────────────────────────┴──────────────────────────────┘
```

**SA Table columns:**

```ts
interface SARow {
  noSA: string;
  spbe: string;
  periodeStart: Date;
  periodeEnd: Date;
  totalKuota: number; // cylinders
  didistribusikan: number;
  sisaKuota: number;
  status: "Aktif" | "Limit" | "Habis";
}
```

- Sisa Kuota column: inline progress bar showing `(didistribusikan/totalKuota)*100`%
- Actions column: `Eye` icon button (view) + `Pencil` icon button (edit)
- 8 mock rows

**Upload Form:**

- Use react-hook-form + zod. Schema:
  ```ts
  z.object({
    noSA: z.string().min(1),
    spbeId: z.string().min(1),
    periodeStart: z.date(),
    periodeEnd: z.date(),
    totalKuota: z.number().min(1),
    catatan: z.string().optional(),
    file: z.instanceof(FileList).optional(),
  });
  ```
- Drag-and-drop zone: `onDragOver`, `onDrop` with visual feedback (`border-dashed border-2 border-primary/40 hover:border-primary bg-primary/5`). Show filename when file selected.

**Info Cards:**

- Gradient card: `bg-gradient-to-br from-[#004d99] to-[#1565c0] text-white`, showing global remaining quota
- Panduan numbered list: 4 steps for uploading SA correctly

---

### Page 3 — Perencanaan Distribusi (Distribution Planning)

**File:** `src/pages/distribution/DistributionPage.tsx`
**Feature:** `src/features/distribution/`

**Rebuild to match this layout:**

```
┌──────────────────────────────────────────────────────────┐
│ PageHeader: "Perencanaan Distribusi"                      │
├──────────────────┬───────────────────────────────────────┤
│ LEFT PANEL 30%   │ RIGHT PANEL 70%                       │
│ "Daftar Rencana" │ Selected plan header:                 │
│ [+Buat Rencana]  │   Name + Badges (LPG type, Area, Cap) │
│                  │   Status badge                        │
│ PlanCard ←active │                                       │
│ PlanCard         │ EDITABLE TABLE                        │
│ PlanCard         │ Cols: Pangkalan | Alamat | Tabung |   │
│ PlanCard         │       Driver(dropdown) | Jam(input) | │
│                  │       Bayar Status | Actions(delete)  │
│                  │                                       │
│                  │ [+ Tambah Pangkalan] (dashed row btn) │
├──────────────────┴───────────────────────────────────────┤
│ FLOATING BOTTOM BAR (sticky bottom, shadow up)           │
│ Estimasi Muatan: 480/600 tabung | Total Driver: 3 |      │
│ [Simpan Draft]  [Cetak]  [Konfirmasi Rencana ▶]         │
└──────────────────────────────────────────────────────────┘
```

**Plan Card:**

```ts
interface DistribusiPlan {
  id: string;
  tanggal: Date;
  nama: string;
  jumlahPangkalan: number;
  kapasitas: number;
  status: "Draft" | "Terjadwal" | "Proses" | "Selesai";
  driverAvatars: string[]; // initials
}
```

- Selected card: `border-l-4 border-primary bg-primary/5`
- Other cards: `bg-white hover:bg-surface-low`
- Driver avatars: stacked circles with initials using `getInitials()` + `stringToColor()`

**Editable Table Rows:**

```ts
interface PlanRow {
  id: string;
  pangkalan: string;
  alamat: string;
  jumlahTabung: number; // editable number input
  driverId: string; // select dropdown
  jam: string; // editable time input HH:mm
  statusBayar: "Lunas" | "COD" | "Pending";
}
```

- Driver dropdown: `<select>` styled with Tailwind, shows driver names from mock list
- Jumlah tabung: `<input type="number">` inline
- Jam: `<input type="time">` inline
- Delete: `Trash2` icon button, `text-red-500 hover:text-red-700`
- Add row: full-width dashed button row at bottom of table

**Bottom Bar:**

- `position: sticky; bottom: 0`
- `bg-white dark:bg-dark-800 border-t border-outline-variant/15 shadow-[0_-4px_16px_rgba(13,27,55,0.06)]`
- Left: capacity chip + driver count chip
- Right: 3 buttons (Simpan Draft = outline, Cetak = secondary, Konfirmasi = gradient primary)

---

### Page 4 — Monitoring Distribusi (with Live Map)

**File:** `src/pages/monitoring/MonitoringPage.tsx`
**Feature:** `src/features/monitoring/`

**Rebuild to match this layout:**

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Monitoring Distribusi"                    │
│ Filter: [Date From] [Date To] [Hari Ini] [Terapkan ▶] │
├────────────────────────────────────────────────────────┤
│ DRIVER CARDS (horizontal scroll, gap-4, no-wrap)       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ...       │
│ │Avatar  │ │        │ │        │ │        │            │
│ │Name    │ │        │ │        │ │        │            │
│ │Status  │ │        │ │        │ │        │            │
│ │Metrics │ │        │ │        │ │        │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
├────────────────────────────────────────────────────────┤
│ LIVE MAP (h-[400px], relative, rounded-xl overflow-hid)│
│ Background: grayscale SVG-style map (use static img or │
│ placeholder div with grid pattern)                     │
│ Overlay: amber dashed SVG route lines                  │
│ Markers: blue filled circles (pangkalan) +             │
│          orange truck icons (drivers in transit)       │
│ Top-left chips: "3 Driver Aktif" | "8 Pangkalan"       │
│ Bottom-right controls: zoom +/- buttons               │
├────────────────────────────────────────────────────────┤
│ DISTRIBUTION TABLE                                     │
│ Header: "Tabel Distribusi" + [Export PDF] button       │
│ Cols: Pangkalan | Alamat | Target | Realisasi |        │
│       Selisih | Pencapaian (progress bar) |            │
│       Waktu Selesai | Status                           │
│ Pagination (10 rows/page)                              │
└────────────────────────────────────────────────────────┘
```

**Driver Card component** (`src/features/monitoring/components/DriverCardRow.tsx` → rename to `DriverCard.tsx`):

```ts
interface DriverCard {
  id: string;
  name: string;
  initials: string; // 2 chars
  color: string; // from stringToColor()
  status: "Dalam Perjalanan" | "Bongkar Muat" | "Standby" | "Selesai";
  pengiriman: number;
  totalTabung: number;
  eta?: string; // "14:30"
}
```

- Card: `min-w-[160px] w-[160px] rounded-xl bg-white p-4 shadow-[0_12px_32px_rgba(13,27,55,0.08)] hover:shadow-lg transition-shadow`
- Avatar circle: 48px, colored bg using `stringToColor(name)`, white initials text

**Live Map Section** (`src/features/monitoring/components/DistribusiMap.tsx`):

- Use a static placeholder with a patterned grey background (`bg-gray-100 dark:bg-gray-800`)
- Overlay an SVG element with:
  - Dashed amber lines (simulate routes): `stroke="#f59e0b" strokeDasharray="8 4"`
  - Blue filled circles at 4–6 fixed coordinate pairs (pangkalan markers)
  - `Truck` lucide icon rendered at 3 positions (active drivers)
- Chip overlays (top-left):
  ```tsx
  <div className="absolute top-4 left-4 flex gap-2">
    <span className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold shadow">
      3 Driver Aktif
    </span>
  </div>
  ```
- Map controls (bottom-right): `+` and `-` `<button>` elements (visual only, no zoom logic needed yet)
- Wrap entire section in `relative rounded-xl overflow-hidden border border-outline-variant/15`

**refetchInterval:** Add `refetchInterval: 30_000` to the useMonitoring query for live refresh.

**Table columns:**

```ts
interface MonitoringRow {
  pangkalan: string;
  alamat: string;
  target: number;
  realisasi: number;
  selisih: number; // computed: target - realisasi
  pencapaian: number; // pct
  waktuSelesai?: string;
  status: "Selesai" | "Proses" | "Partial" | "Antrian";
}
```

---

### Page 5 — Pembayaran (Payments)

**File:** `src/pages/payments/PaymentPage.tsx`
**Feature:** `src/features/payment/`

**Rebuild to match this layout:**

```
┌───────────────────────────────────────────────────────┐
│ PageHeader: "Pembayaran"                               │
├───────────────────────────────────────────────────────┤
│ TABS (shadcn Tabs): [Menunggu Verifikasi (3)] |        │
│                     [Terverifikasi] | [Semua]          │
├────────────────┬──────────────┬────────────────────── │
│ STAT CARD 1    │ STAT CARD 2  │ STAT CARD 3           │
│ Total          │ Butuh        │ Selesai                │
│ Outstanding    │ Tindakan     │ Hari Ini               │
│ Rp 45.280.000  │ (red left    │ 12 Selesai            │
│                │ border card) │                        │
├────────────────┴──────────────┴────────────────────── │
│ PAYMENT CARDS LIST (vertical, gap-4)                  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ [Store icon] Nama Pangkalan      Location badge  │  │
│ │              Invoice badge  Date badge           │  │
│ │                                                  │  │
│ │ Amount: Rp 4.500.000 (large, primary blue)       │  │
│ │ Bank: Mandiri Virtual Account xxxxxx             │  │
│ │                                                  │  │
│ │ [Proof image thumbnail]  [Verify ✓] [Reject ✗]  │  │
│ └──────────────────────────────────────────────────┘  │
│ (3 cards for "Menunggu Verifikasi" tab)                │
└───────────────────────────────────────────────────────┘
```

**Payment Card** (`src/features/payment/components/PaymentCard.tsx`):

```ts
interface Payment {
  id: string;
  pangkalanName: string;
  alamat: string;
  invoiceNo: string;
  tanggal: Date;
  totalAmount: number;
  bank: string; // "Mandiri Virtual Account"
  accountNo: string;
  proofUrl?: string; // image URL or placeholder
  status: "Menunggu" | "Terverifikasi" | "Ditolak";
}
```

- Card layout: `flex flex-col gap-4 bg-white rounded-xl p-6 shadow-[0_12px_32px_rgba(13,27,55,0.08)]`
- Amount: `text-3xl font-bold text-[#1565c0]`
- Proof image: `w-24 h-20 rounded-lg object-cover ring-1 ring-outline-variant/20` + hover overlay with `Eye` icon
- Verify button: gradient primary
- Reject button: `border border-red-300 text-red-600 hover:bg-red-50`
- Stat Card 2 ("Butuh Tindakan"): `border-l-4 border-red-500 bg-red-50/50`

**Verification Modal** (already exists as `VerificationModal.tsx` — update to shadcn `Dialog`):

- Confirm: `"Apakah Anda yakin ingin memverifikasi pembayaran ini?"`
- Reject: textarea for rejection reason

---

### Page 6 — Laporan Keuangan (Financial Reports)

**File:** `src/pages/reports/ReportsPage.tsx`

**Rebuild to match this layout:**

```
┌────────────────────────────────────────────────────────┐
│ PageHeader: "Laporan Keuangan"                         │
│ Right side: [Month Picker] [Export PDF] [Export Excel] │
├─────────┬──────────┬────────────────┬─────────────── │
│ KPI 1   │ KPI 2    │ KPI 3          │ KPI 4           │
│ Total   │ Total    │ Biaya          │ Laba Bersih     │
│ Pendapat│ Piutang  │ Operasional    │ (emerald)       │
│ (blue)  │ (red)    │ (amber)        │                 │
├─────────┴──────────┴────────────────┴─────────────── │
│ ┌───────────────────────────────┐ ┌──────────────────┐│
│ │ Pendapatan vs Pengeluaran     │ │ Komposisi        ││
│ │ Bulanan (BarChart, 6 months)  │ │ Pendapatan       ││
│ │ Two bars: Pendapatan (blue) + │ │ (PieChart donut) ││
│ │ Pengeluaran (amber)           │ │ + legend         ││
│ └───────────────────────────────┘ └──────────────────┘│
├────────────────────────────────────────────────────────┤
│ RECONCILIATION TABLE                                   │
│ Header: search input + filter button                   │
│ Cols: Pangkalan | Total Tagihan | Sudah Dibayar |      │
│       Sisa Piutang | Transaksi | Status | Aksi         │
│ Progress bar for payment % in "Sudah Dibayar"         │
│ Total footer row                                       │
│ Pagination                                             │
└────────────────────────────────────────────────────────┘
```

**KPI Card top-border colors:**

- Total Pendapatan: `border-t-4 border-[#1565c0]` (blue)
- Total Piutang: `border-t-4 border-[#ba1a1a]` (red) + `TrendingDown` icon
- Biaya Operasional: `border-t-4 border-[#813900]` (amber)
- Laba Bersih: `border-t-4 border-emerald-500` + `TrendingUp` icon

**Bar chart mock data (6 months Dec–May):**

```ts
[
  { month: "Des", pendapatan: 210_000_000, pengeluaran: 28_000_000 },
  { month: "Jan", pendapatan: 240_000_000, pengeluaran: 32_000_000 },
  { month: "Feb", pendapatan: 195_000_000, pengeluaran: 25_000_000 },
  { month: "Mar", pendapatan: 270_000_000, pengeluaran: 38_000_000 },
  { month: "Apr", pendapatan: 260_000_000, pengeluaran: 35_000_000 },
  { month: "Mei", pendapatan: 284_500_000, pengeluaran: 38_200_000 },
];
```

- Two `<Bar>` components: `dataKey="pendapatan" fill="#1565c0"` and `dataKey="pengeluaran" fill="#f59e0b"`
- Custom tooltip using `formatCurrency()`

**Donut chart:**

- 3 segments with custom legend below
- Segments: Pembayaran Pangkalan 60% `#1565c0`, Margin Distribusi 25% `#f59e0b`, Lain-lain 15% `#10b981`
- Center label: "Total" with total value

**Reconciliation Table:**

```ts
interface PangkalanRow {
  pangkalan: string;
  totalTagihan: number;
  sudahDibayar: number;
  sisaPiutang: number; // computed
  transaksi: number;
  paidPct: number; // computed percentage
  status: "Lunas" | "Sebagian" | "Belum";
}
```

- 8 mock rows
- Sudah Dibayar cell: inline progress bar + `formatCurrency()` value
- Export PDF/Excel: buttons with `FileDown` icon (stub, console.log for now)
- Total footer: bold row summing numeric columns

---

### Page 7 — Notifikasi & WhatsApp Blast

**File:** `src/pages/notifications/NotificationPage.tsx`
**Feature:** `src/features/notification/`

**Rebuild to match this layout:**

```
┌──────────────────────┬────────────────────────────────────┐
│ LEFT PANEL 38%       │ RIGHT PANEL 62%                    │
│                      │                                    │
│ Sub-tabs:            │ SETTINGS PANEL                     │
│ [Notifikasi Sistem]  │ "Konfigurasi Pengingat & Notifikasi"│
│ [WhatsApp Blast 🟢]  │                                    │
│                      │ ┌──────────┐ ┌──────────────────┐  │
│ ── IF Notifikasi ──  │ │Operasional│ │ Inventory Alert  │  │
│ "Pusat Notifikasi"   │ │ settings  │ │ settings         │  │
│ Unread badge         │ │ 4 toggles │ │ 2 toggles +      │  │
│ [Tandai Semua Dibaca]│ │           │ │ slider 5%-50%    │  │
│ Filter chips:        │ └──────────┘ └──────────────────┘  │
│ [Semua][Distribusi]  │                                    │
│ [Sistem][Kritis]     │ Media Pengiriman:                  │
│                      │ [Email card] [SMS card] [App card] │
│ Notification list:   │                                    │
│ - Priority border    │ [Reset]  [Simpan Pengaturan]       │
│ - Icon + title       │                                    │
│ - Timestamp          │                                    │
│ - Description        │                                    │
│                      │                                    │
│ ── IF WhatsApp ──    │                                    │
│ Blast form:          │ WhatsApp API Config:               │
│ Recipient selector   │ Provider dropdown                  │
│ Template dropdown    │ API Key (masked input)             │
│ Message preview      │ Phone number + country             │
│ (WA green bubble)    │ [Test] [Simpan]                    │
│ Schedule toggle      │ Stats: sent, success%, latency     │
│ [Kirim Sekarang 🟢]  │                                    │
│                      │ Tips Card (gradient blue)          │
│ Blast History list   │                                    │
└──────────────────────┴────────────────────────────────────┘
```

**Notification Item** (`src/features/notification/components/NotificationItem.tsx`):

```ts
interface Notification {
  id: string;
  type: "Distribusi" | "Sistem" | "Kritis" | "Inventori";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
}
```

- Left border: red for `high`/`Kritis`, amber for `medium`, blue for normal
- Unread: `bg-blue-50/50 dark:bg-blue-950/20`; read: `bg-white`

**Toggle Settings** (`src/features/notification/components/ReminderSettingsForm.tsx`):

- Use native `<input type="checkbox" role="switch">` styled to look like a toggle, or build a simple `<Toggle>` component
- 4 operational settings + 2 inventory settings
- Slider for threshold: `<input type="range" min={5} max={50}>`

**WhatsApp Blast Form** (new component: `src/features/notification/components/WhatsAppBlastForm.tsx`):

```ts
interface BlastPayload {
  recipients: "all" | "region1" | "region2";
  templateId: string;
  message: string; // preview, derived from template
  scheduledAt?: Date;
}
```

- Message preview: `bg-[#DCF8C6] rounded-lg p-3 text-sm` (WhatsApp green bubble)
- Kirim button: `bg-gradient-to-r from-[#128C7E] to-[#25D366] text-white`
- History items: 3 mock records with status indicators

**WhatsApp API Config** (new component: `src/features/notification/components/WhatsAppApiConfig.tsx`):

- Provider dropdown (Fonnte, Wablas, Twilio)
- API Key: `<input type="password">` with show/hide toggle
- Phone: `+62` prefix + number input
- Analytics footer: 3 mini stat chips

---

## Global File Updates Required

### 1. Tailwind Config — Add design tokens

File: `tailwind.config.js`
Add to `theme.extend.colors`:

```js
'primary': '#004d99',
'primary-container': '#1565c0',
'surface': '#f7f9fc',
'surface-low': '#f2f4f7',
'on-surface': '#191c1e',
'on-surface-variant': '#424752',
'outline-variant': '#c2c6d4',
'sidebar-bg': '#1A2744',
```

### 2. App.tsx — Verify all routes registered

Ensure these routes exist (add if missing):

- `/dashboard`, `/sa`, `/distribution`, `/monitoring`, `/payments`, `/reports`, `/notifications`, `/settings`

### 3. Sidebar.tsx — Verify navigation entries

All 6 core modules must be present with correct icons and paths.

---

## Mock Data Guidelines

All pages use local mock data in the same file (or a sibling `mockData.ts`). Mark every mock with:

```ts
// TODO: Replace with useQuery() call to apiClient when backend is ready
```

Data shapes must exactly match the TypeScript interfaces defined above so migration to real API is a `useQuery` wrapper swap only.

---

## Completion Checklist

For each page, verify:

- [ ] Matches stitch layout (panels, spacing, component positions)
- [ ] All colors use design token classes (no raw hex inline)
- [ ] Dark mode `dark:` variants on all color classes
- [ ] Status badges use pill shape with 10% opacity bg
- [ ] Tables have no vertical lines, alternating row bg
- [ ] Primary CTAs use gradient button
- [ ] Currency values use `formatCurrency()`
- [ ] Dates use `formatDate()` / `formatDateTime()`
- [ ] Named exports only
- [ ] TypeScript interfaces defined for all data shapes
- [ ] Mock data marked with TODO comment
