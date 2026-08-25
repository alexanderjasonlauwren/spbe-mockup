# One codebase, two builds

The demo and the integration build are the same code with a different data
source. `VITE_DATA_SOURCE=mock` produces a static site with no backend;
`VITE_DATA_SOURCE=api` talks to the real service.

```
npm run build                          # demo (mock is the default)
VITE_DATA_SOURCE=api npm run build     # integration
```

## Why not two repositories

The mock coupling is confined to sixteen feature API files. A fork would
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

| Feature | Adapter |
| --- | --- |
| users | mock + http (list, create, update, delete) |
| everything else | mock only — no backend endpoint yet |
