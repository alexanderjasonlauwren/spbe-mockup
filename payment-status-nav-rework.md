# BACKLOG — Payment-flow naming collision and sidebar grouping rework

> **Status:** Deferred. Superseded in priority by the "remove payment
> verification gate, cater harga beli/harga jual" pivot (see conversation
> around 2026-09-16). Before executing this, re-check its premises: if the
> payment-gates-dispatch flow (`PaymentControlBoard`, `Alokasikan`/`Lepas`,
> `FundStop`) is removed or made backlog per that pivot, several sections
> below (especially §1, §3, §4) may be moot or need re-scoping around
> whatever replaces it. §2 (OutletDetailPage's colliding link) stays valid
> regardless, since it only depends on PaymentPage, not the payment-gating
> board.

# Fix payment-flow naming collision and sidebar grouping in SiDistrib

## Context

The client flagged three things after using the payment/distribution screens:
1. Releasing a pangkalan's stop for dispatch forces a detour to a different,
   differently-grouped menu ("Catat Penerimaan Kas") just to record the money
   that already arrived.
2. The naming doesn't sound right.
3. The menu grouping is weird.

Re-reading `fortius-backend/docs/Flow Kerja Distribusi Tabung, SA, dan
Pembukuan Agen.md` and auditing every page in the Operasi Harian and Keuangan
sidebar groups turned up a confirmed, concrete bug behind all three
complaints, not just a vibe: **two different destinations in this app are
both labelled "Verifikasi Pembayaran"**.

- The sidebar nav item "Verifikasi Pembayaran" → `/payment-control` →
  `PaymentControlBoard` — today's per-pangkalan payment-gating board
  (Alokasikan/Lepas a receipt against a dispatch stop).
- `OutletDetailPage`'s own "Tagihan tertunda" panel has an unrelated link,
  independently labelled "Verifikasi pembayaran", pointing to `/payments` →
  `PaymentPage` — the page where a receipt is recorded, verified/rejected,
  and allocated to an invoice.

Same phrase, two unrelated pages. That collision is also *why* the FE feels
like it forces a detour: the board's own vocabulary borrowed the word
"verifikasi" from the page it needs you to visit, so the two screens read as
the same thing while doing different jobs, and they live in different
sidebar sections (Operasi Harian vs Keuangan) even though the doc (§5, §7)
treats "who's paid today → allocate/release" as one continuous daily loop.

This plan is FE-only (`admin-dashboard`), no backend or route changes. The
intended outcome: one page keeps "verifikasi" (PaymentPage's real
accept/reject action), the payment-gating board gets a name that matches the
doc's own vocabulary and doesn't collide, the daily loop's two menu items sit
next to each other, and the existing one-way deep link between them becomes
a working round trip.

## 1. Rename the colliding board: "Verifikasi Pembayaran" → "Status Pembayaran"

Doc language (§5 "sudah/belum melakukan pembayaran", §7, §9.3 "ketepatan
pembayaran") never uses "verifikasi" for this board — it's always
"pembayaran"/"status pembayaran". "Status" also correctly signals a
read-and-gate view, distinct from PaymentPage's actual verify/reject action.

- `src/layouts/nav.ts:96` — `name: "Verifikasi Pembayaran"` → `"Status
  Pembayaran"`. Line 99 `hint` — drop "terverifikasi": `"Status pembayaran
  per pangkalan sebelum armada berangkat"`. Icon (`ClipboardCheck`) unchanged.
- `src/pages/payments/PaymentControlPage.tsx` — `title="Verifikasi
  Pembayaran"` → `"Status Pembayaran"`; reword `description` to drop
  "terverifikasi", e.g. `"Periksa status pembayaran tiap pangkalan sebelum
  armada berangkat, lalu alokasikan atau lepas dana per titik."`
- `src/features/distribution/components/PaymentControlBoard.tsx` —
  `PanelHeader title="Verifikasi pembayaran sebelum berangkat"` → `"Status
  pembayaran sebelum berangkat"`; error string `"Verifikasi pembayaran tidak
  dapat dimuat"` → `"Status pembayaran tidak dapat dimuat"`. Leave the
  panel's own `hint` ("Hanya pembayaran terverifikasi yang dihitung sebagai
  dana tersedia") — that "terverifikasi" correctly refers to PaymentPage's
  verify action as an input condition, not this board's own name.
- `src/pages/payments/PaymentPage.tsx` — update the comment above
  `outletFromLink` ("Arriving from Verifikasi Pembayaran's...") to say
  "Status Pembayaran" for consistency (no user-facing effect).
- `src/pages/auth/LoginPage.tsx` — marketing line "...posisi armada, dan
  verifikasi pembayaran dalam satu papan." → "...posisi armada, dan status
  pembayaran dalam satu papan." (this is pitching the board, not PaymentPage).

## 2. Fix OutletDetailPage's own colliding link

`src/pages/outlet/OutletDetailPage.tsx:310` —
`<Link to="/payments">Verifikasi pembayaran</Link>` inside the "Tagihan
tertunda" panel. It targets `/payments`, not the renamed board, so leave the
route — just stop it from reading as "the same verifikasi" as anything else.
Relabel to `"Catat penerimaan kas"`, matching PaymentPage's own button text
for the action a pending-invoice panel actually wants you to take next.

## 3. Move "Penerimaan Kas" next to "Status Pembayaran" in the sidebar

Recording a receipt and gating today's dispatch on it are one continuous
daily loop (doc §5/§7), not two unrelated menu items in two different
sidebar sections. Piutang, Buku Besar, Laporan, Rekap Transaksi, Pengeluaran
& Kas Kecil, and Bukti Pengeluaran stay in Keuangan — confirmed by reading
every one of those pages, they're genuinely periodic back-office/reporting
concerns (aging, GL, period reports, expense approval), not part of the
daily pangkalan-payment loop.

`src/layouts/nav.ts` — cut the `Penerimaan Kas` item (`href: "/payments"`,
currently lines 135-141 in Keuangan) and splice it into Operasi harian
immediately after the renamed "Status Pembayaran" entry, before "Klaim
Transportasi".

New Operasi harian order: Beranda → Pesanan Outlet → Schedule Agreement →
Perencanaan Distribusi → Monitoring Distribusi → **Status Pembayaran** →
**Penerimaan Kas** → Klaim Transportasi.

New Keuangan order: Pengeluaran & Kas Kecil → Bukti Pengeluaran → Piutang →
Buku Besar → Laporan → Rekap Transaksi.

No `permission` values change (`PERMISSIONS.PAYMENTS_VIEW` stays on both
items). `PaymentControlPage`/`PaymentPage`'s own `eyebrow` props were already
set to "Operasi harian" for the board in the prior session — `PaymentPage`'s
`eyebrow="Keuangan"` should be updated to `"Operasi harian"` to match its new
group (its route/permission stay the same; only the in-page breadcrumb text
changes, matching the pattern `sectionFor()` derives from `nav.ts` for the
sidebar/top-bar breadcrumb).

## 4. Close the loop both directions, with date context preserved

The one-way deep link already exists (`PaymentControlBoard`'s empty-state
"Catat penerimaan" button → `/payments?outlet=<id>`, pre-filling the outlet
via `initialOutletId`). It drops the board's selected date, and there is no
way back. Thread `date` through both hops instead of leaving it behind:

- `PaymentControlBoard.tsx` — the `FundStopDialog`'s existing Link
  (`to={\`/payments?outlet=${target?.outletId ?? ""}\`}`) gains the board's
  current `date` state: `` `/payments?outlet=${target?.outletId ?? ""}&date=${date}` ``.
- `PaymentPage.tsx` — read the new `date` param alongside the existing
  `outlet` one (`searchParams.get("date")`). Pass it into `RecordPaymentDialog`
  as a new optional prop (e.g. `initialTanggal`) so the record form's
  "Tanggal" field defaults to the board's date instead of today — sensible on
  its own, since the receipt is being recorded for that day's dispatch.
- `RecordPaymentDialog`'s `useDeskMutation` `success` callback — when the
  dialog was opened via the deep link (`initialOutletId` truthy; a directly
  opened "Catat penerimaan" from the Penerimaan Kas page itself should not
  show this, it would be irrelevant noise there), add a toast `action`:
  `{ label: "Kembali ke Status Pembayaran", onClick: () =>
  navigate(\`/payment-control?outlet=${form.outletId}&date=${form.tanggal}\`) }`.
  `ToastOptions` already supports `action?: { label, onClick }`
  (`src/components/ui/toast-context.ts`) — no new plumbing needed there.
  Requires importing `useNavigate` from `react-router-dom` in `PaymentPage.tsx`
  (only `Link`/`useSearchParams` are imported today) and calling it inside
  `RecordPaymentDialog`.
- `PaymentControlBoard.tsx` — read `?date=` on mount to restore the date
  (`useState(() => searchParams.get("date") ?? today())`) so landing back
  from the toast action shows the same day's board instead of resetting to
  today. Skip building a scroll-to/highlight-the-row effect — the table is
  short enough that restoring the correct date is the real fix; a highlight
  is optional polish nobody asked for and adds ref/timeout complexity for
  little gain.

## Explicitly out of scope (name only, do not build)

- **Unified "Performa Pangkalan" scorecard** — doc §9 wants SP history +
  volume + payment punctuality judged together per outlet; today only SP
  history exists, buried in `OutletDetailPage.tsx`'s "Riwayat Surat
  Peringatan" subsection. Worth a dedicated future plan, not a rename/regroup.
- **SIM3LON-style single merged planning+status page** — keep
  `DistributionPage`'s monthly `AllocationMatrixPanel` and the renamed daily
  "Status Pembayaran" board as two separate, cross-linked pages: one is a
  monthly quota-planning artifact from the SA, the other a daily
  transactional gate with a different primary action (plan vs.
  allocate/release). Forcing them into one page would conflate two different
  cadences.
- **Receipt-proof upload / bank reconciliation** — already-discussed
  backend-heavy gap (`core.payment_proofs`/`document_assets` unwired), not a
  nav rework.

## Critical files

- `src/layouts/nav.ts`
- `src/pages/payments/PaymentControlPage.tsx`
- `src/features/distribution/components/PaymentControlBoard.tsx`
- `src/pages/payments/PaymentPage.tsx`
- `src/pages/outlet/OutletDetailPage.tsx`
- `src/pages/auth/LoginPage.tsx`

## Verification

1. `npx tsc --noEmit -p .` and `npx eslint <touched files>` clean.
2. `npx vitest run` — full suite still green (383 tests today; this is a
   text/nav/prop change, no test should need updating unless one asserts the
   old "Verifikasi Pembayaran" string or nav order directly — grep tests for
   both before declaring done).
3. Live in the browser against the running dev server: confirm the sidebar
   shows "Status Pembayaran" directly above "Penerimaan Kas" in Operasi
   Harian, with nothing named "Penerimaan Kas" left in Keuangan; open Outlet
   detail for an outlet with "Tagihan tertunda" and confirm the link now
   reads "Catat penerimaan kas"; walk the full loop end-to-end: Status
   Pembayaran → Alokasikan on an unpaid outlet with no receipt → Catat
   penerimaan (lands on Penerimaan Kas with outlet + date pre-filled) → save
   → click the "Kembali ke Status Pembayaran" toast action → confirm it
   lands back on the same date with the outlet now fundable.
