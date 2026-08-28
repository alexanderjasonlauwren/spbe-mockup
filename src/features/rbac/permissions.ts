/**
 * Permission codes, in the backend's vocabulary.
 *
 * These values used to be the console's own invention — `sa:view`,
 * `payments:verify` — while the backend authorises on `module.action.resource`
 * codes seeded from `seeds/03-permissions/catalogue.go`. Two vocabularies for
 * one concept: the console could gate a button on `sa:view` while the route it
 * calls required `distribution.read.schedule_agreements`, and nothing connected
 * the two. It went unnoticed only because the console had never authenticated
 * against the backend.
 *
 * The backend's codes win, and there is no translation table. A map between two
 * vocabularies has to be maintained by whoever adds the next permission, in a
 * file they have no reason to open, and the failure when they forget is a menu
 * item that answers 403.
 *
 * **Changing a value here is a real change.** Every guard reads these constants
 * — nowhere in the console writes a permission string literal — so a wrong value
 * hides a feature from everyone rather than breaking a build.
 *
 * @see seeds/03-permissions/catalogue.go — the catalogue these must match
 */
export const PERMISSIONS = {
  // Users — the `iam` module, which on the backend is both a schema and an
  // RBAC grouping by coincidence.
  USERS_VIEW: "iam.read.users",
  USERS_CREATE: "iam.create.users",
  USERS_EDIT: "iam.update.users",
  USERS_DELETE: "iam.delete.users",

  // Products. `masterdata` spans products, outlets, drivers, vehicles and
  // units — grouped for the person granting access, not by schema.
  PRODUCTS_VIEW: "masterdata.read.products",
  PRODUCTS_CREATE: "masterdata.create.products",
  PRODUCTS_EDIT: "masterdata.update.products",
  PRODUCTS_DELETE: "masterdata.delete.products",

  // Schedule Agreements
  SA_VIEW: "distribution.read.schedule_agreements",
  SA_CREATE: "distribution.create.schedule_agreements",
  SA_EDIT: "distribution.update.schedule_agreements",

  // Distribution planning
  DISTRIBUTION_VIEW: "distribution.read.distribution_orders",
  DISTRIBUTION_CREATE: "distribution.create.distribution_orders",
  DISTRIBUTION_EDIT: "distribution.update.distribution_orders",

  // Payments
  PAYMENTS_VIEW: "finance.read.payments",
  PAYMENTS_CREATE: "finance.create.payments",
  PAYMENTS_VERIFY: "finance.verify.payments",

  // Delivery execution — what happens at the drop, recorded by whoever is
  // there. Executing is an update to the delivery row, not a verb of its own.
  DELIVERIES_VIEW: "distribution.read.deliveries",
  DELIVERIES_EXECUTE: "distribution.update.deliveries",

  // Drivers. Assigning one to a run edits the plan, not the driver, which is
  // why ASSIGN and MANAGE point at different resources.
  DRIVERS_VIEW: "masterdata.read.drivers",
  DRIVERS_ASSIGN: "distribution.update.distribution_orders",
  DRIVERS_MANAGE: "masterdata.update.drivers",

  // Orders. Distinct from distribution_orders on the backend: an order is what
  // an outlet asks for, a distribution order is the day's plan.
  ORDERS_VIEW: "distribution.read.orders",
  ORDERS_CREATE: "distribution.create.orders",
  ORDERS_EDIT: "distribution.update.orders",
  ORDERS_DELETE: "distribution.delete.orders",

  // Settings edits the tenant, which is what the settings page writes.
  SETTINGS_VIEW: "iam.read.tenants",
  SETTINGS_EDIT: "iam.update.tenants",

  // ---------------------------------------------------------------------
  // Console-only, because the backend has no code for them yet.
  //
  // The `console.` prefix is deliberate and is a to-do list, not a design. No
  // backend role grants these, so against the API the features they guard stay
  // hidden — which is correct, because the routes behind them do not exist
  // either. The mock grants them so the demo is complete.
  //
  // Each disappears the moment its backend counterpart is seeded:
  //
  //   SA_IMPORT           needs a code when the Base SA upload lands (Phase D1).
  //                       Not `create.schedule_agreements`: importing a
  //                       spreadsheet of daily targets is a different authority
  //                       from signing an agreement.
  //   DISTRIBUTION_DELETE the catalogue gives distribution_orders read/create/
  //                       update/approve/reject and no delete. That looks
  //                       deliberate — a plan is cancelled, not erased — so the
  //                       console should probably drop this rather than the
  //                       backend gain it.
  //   REPORTS_*           catalogue.go refuses these by name: "Reports have no
  //                       table and no route yet. A permission that guards
  //                       nothing is worse than a missing one, because it reads
  //                       as coverage."
  // ---------------------------------------------------------------------
  SA_IMPORT: "console.import.schedule_agreements",
  DISTRIBUTION_DELETE: "console.delete.distribution_orders",
  REPORTS_VIEW: "console.read.reports",
  REPORTS_EXPORT: "console.export.reports",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Codes the backend does not define, so nothing can grant them over HTTP.
 *
 * Exported so the mock can grant exactly this set and a test can assert the
 * list shrinks rather than grows.
 */
export const CONSOLE_ONLY_PERMISSIONS: readonly string[] = Object.values(
  PERMISSIONS,
).filter((code) => code.startsWith("console."));
