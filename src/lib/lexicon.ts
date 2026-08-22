/**
 * The words this tenant uses for the things it moves.
 *
 * The console is not an LPG console. It plans rounds, loads vehicles, draws
 * against a quota and bills the receiver — none of which is specific to gas
 * cylinders. But every screen has to *call* those things something, and the
 * right noun is the tenant's, not ours: an LPG agency says pangkalan, tabung
 * and SPBE; a water depot says depot, galon and pabrik; a feed distributor
 * says toko, sak and pabrik.
 *
 * So the vocabulary is data. The code names the *role* (`outlet`, `supplier`,
 * `unit`) and asks this module for the tenant's word at render time. Nothing
 * below the UI layer should carry an industry noun as a literal.
 *
 * Module-level rather than a hook, mirroring `setActiveScope` in mocks/scope:
 * these are read from print templates, CSV headers and toast strings that are
 * not React components and cannot subscribe to anything.
 *
 * Where a single product *is* in scope — an invoice line, a stop's product
 * block — use that product's own `satuan` instead. `unitLabel` is the fallback
 * for totals that span products, not a replacement for the per-product word.
 */

import { formatNumber } from "./format";

/** The roles a tenant supplies a noun for. Keys match `SettingsEntity.istilah`. */
export type TermKey = "satuan" | "outlet" | "pemasok";

/**
 * Deliberately colourless. A brand-new browser shows these for the half-second
 * before settings load — better a neutral word than a confidently wrong
 * industry's.
 */
const FALLBACK: Record<TermKey, string> = {
  satuan: "unit",
  outlet: "outlet",
  pemasok: "pemasok",
};

const KEY = "sidistrib:istilah";

/** Hydrated from the last session so the first paint after a reload is right. */
const terms: Record<TermKey, string> = { ...FALLBACK, ...readCache() };

function readCache(): Partial<Record<TermKey, string>> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<TermKey, string>>) : {};
  } catch {
    // No storage, or a stale shape from an older build. Fallbacks stand.
    return {};
  }
}

/** Called once settings land, from the layout that owns the session. */
export function setLexicon(next: Partial<Record<TermKey, string>>): void {
  let changed = false;
  for (const key of Object.keys(FALLBACK) as TermKey[]) {
    const value = next[key]?.trim();
    if (!value || value === terms[key]) continue;
    terms[key] = value;
    changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(terms));
  } catch {
    // Private mode. The lexicon still holds for this session.
  }
}

/** The tenant's word for a role, lower-case, as it reads mid-sentence. */
export function term(key: TermKey): string {
  return terms[key];
}

/** Sentence-case, for column headers and labels that open a phrase. */
export function termTitle(key: TermKey): string {
  const value = terms[key];
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ── role-specific readers ─────────────────────────────────────────────────
 * Thin, but they keep call sites reading as prose rather than as lookups, and
 * they are the seam to widen if a role ever needs a plural or a genitive.
 */

/** What one unit of the moved thing is called: tabung, galon, dus, sak. */
export const unitLabel = () => term("satuan");
export const unitLabelTitle = () => termTitle("satuan");

/** What a delivery destination is called: pangkalan, depot, toko, gerai. */
export const outletLabel = () => term("outlet");
export const outletLabelTitle = () => termTitle("outlet");

/** What a supply source is called: SPBE, pabrik, distributor pusat. */
export const supplierLabel = () => term("pemasok");
export const supplierLabelTitle = () => termTitle("pemasok");

/** "1.284 tabung" — pass a product's own `satuan` when one is in scope. */
export function formatUnits(value: number, satuan: string = terms.satuan): string {
  return `${formatNumber(value)} ${satuan}`;
}
