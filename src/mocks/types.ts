/**
 * @deprecated Import from `@/types/domain` instead.
 *
 * These are the application's domain types — what a product or a user *is* —
 * not a detail of the mock database. They lived here because the mocks were the
 * only data source; now that a real one exists, a component importing its types
 * from `@/mocks` would make the mock layer impossible to remove.
 *
 * Re-exported rather than moved in one sweep so the change is reviewable. New
 * code imports from `@/types/domain`.
 */
export * from "@/types/domain";
