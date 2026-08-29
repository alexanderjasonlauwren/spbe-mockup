import { describe, expect, it } from "vitest";

import { subtreeOf } from "./scope";
import type { TenantEntity } from "@/types/domain";

/**
 * The frontend's mirror of `public.visible_tenant_ids()`.
 *
 * scope.ts says of itself: "Mirrored from the backend exactly ... If these two
 * ever disagree, this file is the one that is wrong." That is a strong claim
 * with nothing checking it, and the failure mode is the worst one this console
 * has: a group seeing a tenant it should not, or a subsidiary's rows vanishing.
 *
 * These are the properties the backend's closure table guarantees, asserted
 * against the walk that stands in for it.
 */
function tenant(id: string, parent: string | null): TenantEntity {
  return {
    id,
    kode: id,
    nama: id,
    aktif: true,
    indukId: parent,
  } as TenantEntity;
}

describe("subtreeOf", () => {
  // Reads travel DOWN the tree. A group sees itself and everything beneath it.
  it("returns a tenant and every descendant, at any depth", () => {
    const tenants = [
      tenant("grup", null),
      tenant("salatiga", "grup"),
      tenant("pati", "grup"),
      tenant("salatiga-pool", "salatiga"),
    ];

    expect(new Set(subtreeOf(tenants, "grup"))).toEqual(
      new Set(["grup", "salatiga", "pati", "salatiga-pool"]),
    );
  });

  // The assertion the whole tenancy model rests on: PT Salatiga and PT Pati are
  // separate legal entities, and neither may see the other's rows.
  it("never reaches a sibling", () => {
    const tenants = [
      tenant("grup", null),
      tenant("salatiga", "grup"),
      tenant("pati", "grup"),
    ];

    expect(subtreeOf(tenants, "salatiga")).toEqual(["salatiga"]);
    expect(subtreeOf(tenants, "pati")).toEqual(["pati"]);
  });

  // Reads travel down, never up. A subsidiary must not see its parent's rows
  // just because the parent can see its own.
  it("never reaches a parent", () => {
    const tenants = [tenant("grup", null), tenant("salatiga", "grup")];

    expect(subtreeOf(tenants, "salatiga")).not.toContain("grup");
  });

  // A leaf is not a special case — it is the same rule with nothing beneath it,
  // and it must still include itself or the tenant sees none of its own data.
  it("always includes the tenant itself", () => {
    expect(subtreeOf([tenant("solo", null)], "solo")).toEqual(["solo"]);
    expect(subtreeOf([], "orphan")).toEqual(["orphan"]);
  });

  // A cycle is not supposed to exist, but the walk pushes while it iterates and
  // an unguarded version loops forever — taking the tab with it rather than
  // showing a wrong number. The backend terminates the same case with UNION
  // rather than UNION ALL; this is the same defence.
  it("terminates on a cycle instead of hanging", () => {
    const tenants = [tenant("a", "b"), tenant("b", "a")];

    expect(new Set(subtreeOf(tenants, "a"))).toEqual(new Set(["a", "b"]));
  });

  // A tenant deactivated mid-tree must not orphan its children from the walk:
  // "active" is a separate question from "visible", and conflating them would
  // make a group lose sight of a live subsidiary because an intermediate holding
  // company was switched off.
  it("walks through an inactive tenant to reach what is beneath it", () => {
    const tenants = [
      tenant("grup", null),
      { ...tenant("holding", "grup"), aktif: false },
      tenant("operating", "holding"),
    ];

    expect(subtreeOf(tenants, "grup")).toContain("operating");
  });
});
