/**
 * The tenancy data source, chosen at build time.
 *
 * Both adapters are real. The mock is not scaffolding to be deleted — it runs
 * the demos, and the backend still has three HTTP modules out of roughly twenty.
 */
import { usesApi } from "@/lib/dataSource";

import type { TenancyApi } from "./contract";
import * as httpApi from "./tenancyApi.http";
import * as mockApi from "./tenancyApi.mock";

// Compile-time proof that BOTH adapters satisfy the contract. Asserted here
// rather than in each file so one line covers both — and so drift between them
// is a build error rather than a runtime surprise in whichever page happens to
// read the field that diverged. That failure is exactly what the users feature
// hit before its contract existed.
const _conformance: [TenancyApi, TenancyApi] = [mockApi, httpApi];
void _conformance;

export const getTenants = usesApi ? httpApi.getTenants : mockApi.getTenants;
export const getTenant = usesApi ? httpApi.getTenant : mockApi.getTenant;
export const createTenant = usesApi ? httpApi.createTenant : mockApi.createTenant;
export const deactivateTenant = usesApi ? httpApi.deactivateTenant : mockApi.deactivateTenant;
