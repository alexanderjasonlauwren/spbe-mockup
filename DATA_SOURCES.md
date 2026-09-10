# One codebase, two builds

The demo and the integration build are the same code with a different data
source. `VITE_DATA_SOURCE=mock` produces a static site with no backend;
`VITE_DATA_SOURCE=api` talks to the real service.

```
npm run build                          # demo (mock is the default)
VITE_DATA_SOURCE=api npm run build     # integration
```

## Why not two repositories

The mock coupling is confined to twenty-one feature API directories. A fork would
duplicate every page, component and layout *around* them — so each UI change
happens twice, and the demo is the copy nobody runs day to day. It breaks
quietly, and you find out in front of a client.

## The pattern

```
src/features/<feature>/api/
  contract.ts          the interface both adapters satisfy
  <feature>Api.mock.ts the mock database
  <feature>Api.http.ts the real API
  <feature>Api.ts      picks one, at build time
```

**Both adapters return domain types.** The wire shape never escapes the HTTP
adapter — that mapping is what keeps components unaware of which source they are
running against, and it is where the English/Indonesian boundary lives
(`full_name` → `nama`).

**The contract is asserted in both adapters:**

```ts
const _contract: UsersApi = { getUsers, createOrUpdateUser, removeUser };
```

That line is not ceremony. Without it the mock returned a `UserEntity` and the
HTTP adapter returned the wire shape, and the mismatch surfaced only in whichever
page happened to read a field present in one and not the other.

## Features with no endpoint yet

Re-export the mock, and say so in the selector:

```ts
// Mock-only for now: the backend has no export endpoint yet.
export const exportUsers = mockApi.exportUsers;
```

An HTTP adapter that throws would be worse — it looks like an outage rather than
unbuilt work.

## Status

| Feature | Adapter | Mock-only exceptions |
| --- | --- | --- |
| auth | mock + http | — |
| bankaccounts | mock + http | — |
| distribution | mock + http | scheduling approved orders onto a plan (no `core.orders` module — see D3 plan's B-Step 2); the printed route sheet (no per-stop address/time on the wire) |
| drivers | mock + http | a driver's today-only stop list (`getDriverSchedule`; the dispatch board is keyed by plan, not by driver) |
| finance | mock + http | an invoice row's surat jalan number (`InvoiceResponse` carries only the delivery's UUID); which invoices a payment was allocated to (no route returns allocation lines, only the total — see `financeApi.http.ts`'s own header); the credit note reason code (the dialog collects free text, the backend wants one of five fixed codes, so every note goes in as `billing_correction`); the trial balance's "Dari" date (the ledger's own trial balance is lifetime-to-date as of one date, not a range) |
| geofence | mock + http | — |
| monitoring | mock + http | — |
| outlet | mock + http | an outlet's recent surat jalan (`getOutletHistory`; not exposed by the service) |
| products | mock + http | cost price and stock (quantity, low-stock flag, stock value) have no service behind them yet — `internal/controller/product` is a catalogue module only; see `productApi.http.ts`'s own header. `ProductView.stokTersedia` flags this so the console hides the panels rather than showing zero as real. |
| sa (schedule agreements) | mock + http | — |
| settings | mock + http | exporting, resetting and advancing the simulated day (properties of the demo database, not a tenant) |
| sopir | mock + http | — |
| tenancy | mock + http | — |
| users | mock + http | export and audit trail (no backend endpoint yet) |
| vehicles | mock + http | — |
| dashboard, notification, ocr, orders, reports, system | mock only | no backend endpoint yet — no contract/mock/http split |
| transactions | mock only | no single backend resource behind it — every row joins a delivery, its invoice, its driver and its schedule agreement, none of which the service returns pre-joined. Building this against the API is a real design task (which entity to page by, how the other three get resolved without an N+1 request per row), not a copy of the vehicles pattern, and is deliberately left for a dedicated pass rather than a shaky partial join done in passing here. |

**A known, reproducible bug, found live and NOT caused by anything in this
table:** `SettingsPage` hangs on its loading skeleton forever against the API
build (confirmed: the underlying `GET /tenants/:id/settings` calls succeed
with valid data — tested directly with the page's own token — but `form`
never populates). Not caused by the `bankaccounts` split above; `git diff`
confirms `settingsApi.http.ts` and `SettingsPage.tsx` were untouched when
this was found. Root cause not yet identified. This blocks live-verifying
`BankSection` (and anything else rendered inside Settings) until fixed —
flag before starting D3's B-Step 3/B-Step 4, both of which touch this page.

A "mock + http" row still throwing on the API build somewhere means an
exception was missed here. Every deliberate gap is named in its adapter file —
most guarded with `assertMockAllowed` so the API build shows the sentence that
explains the gap rather than invented data (`grep -rn assertMockAllowed
src/features`); a few (settings, users) are plain re-exports of a demo-only or
not-yet-built capability, commented in place — never a silent fallback either
way.
