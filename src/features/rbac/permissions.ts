export const PERMISSIONS = {
  // Users
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",

  // Pangkalan (Distribution Partners)
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT: "products:edit",
  PRODUCTS_DELETE: "products:delete",

  // SA Management (Schedule Agreement)
  SA_VIEW: "sa:view",
  SA_CREATE: "sa:create",
  SA_EDIT: "sa:edit",
  SA_IMPORT: "sa:import",

  // Distribution Planning
  DISTRIBUTION_VIEW: "distribution:view",
  DISTRIBUTION_CREATE: "distribution:create",
  DISTRIBUTION_EDIT: "distribution:edit",
  DISTRIBUTION_DELETE: "distribution:delete",

  // Payments
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_VERIFY: "payments:verify",

  // Drivers
  DRIVERS_VIEW: "drivers:view",
  DRIVERS_ASSIGN: "drivers:assign",
  DRIVERS_MANAGE: "drivers:manage",

  // Orders (legacy, keep for compatibility)
  ORDERS_VIEW: "orders:view",
  ORDERS_CREATE: "orders:create",
  ORDERS_EDIT: "orders:edit",
  ORDERS_DELETE: "orders:delete",

  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
