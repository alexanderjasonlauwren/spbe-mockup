# One codebase, two builds

The demo and the integration build are the same code with a different data
source. `VITE_DATA_SOURCE=mock` produces a static site with no backend;
`VITE_DATA_SOURCE=api` talks to the real service.

```
npm run build                          # demo (mock is the default)
VITE_DATA_SOURCE=api npm run build     # integration
```

## Why not two repositories

The mock coupling is confined to twenty feature API directories. A fork would
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
| distribution | mock + http | scheduling approved orders onto a plan (no `core.orders` module); the printed route sheet (no per-stop address/time on the wire) |
| drivers | mock + http | a driver's today-only stop list (`getDriverSchedule`; the dispatch board is keyed by plan, not by driver) |
| monitoring | mock + http | — |
| outlet | mock + http | an outlet's recent surat jalan (`getOutletHistory`; not exposed by the service) |
| sa (schedule agreements) | mock + http | — |
| settings | mock + http | exporting, resetting and advancing the simulated day (properties of the demo database, not a tenant) |
| sopir | mock + http | — |
| tenancy | mock + http | — |
| users | mock + http | export and audit trail (no backend endpoint yet) |
| vehicles | mock + http | — |
| dashboard, finance, notification, ocr, orders, products, reports, system, transactions | mock only | no backend endpoint yet — no contract/mock/http split |

A "mock + http" row still throwing on the API build somewhere means an
exception was missed here. Every deliberate gap is named in its adapter file —
most guarded with `assertMockAllowed` so the API build shows the sentence that
explains the gap rather than invented data (`grep -rn assertMockAllowed
src/features`); a few (settings, users) are plain re-exports of a demo-only or
not-yet-built capability, commented in place — never a silent fallback either
way.
