// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useResettableState } from "./useResettableState";

/**
 * The hook that replaced ten "seed local state from server data in an effect"
 * sites. Ten call sites is enough that a subtle difference in reset semantics
 * would show up as ten different UI bugs, none of them obviously related.
 *
 * The properties here are exactly the ones an effect with the same dependency
 * array had, because that equivalence is what made each conversion mechanical
 * and safe.
 */
describe("useResettableState", () => {
  it("starts from the computed value", () => {
    const { result } = renderHook(() => useResettableState(["a"], () => "seeded"));
    expect(result.current[0]).toBe("seeded");
  });

  // The point of local state: an edit must survive, or the field clears itself
  // as the user types.
  it("keeps an edit while the dependencies are unchanged", () => {
    const { result, rerender } = renderHook(
      ({ dep }) => useResettableState([dep], () => `from-${dep}`),
      { initialProps: { dep: "a" } },
    );

    act(() => result.current[1]("edited"));
    expect(result.current[0]).toBe("edited");

    rerender({ dep: "a" });
    expect(result.current[0]).toBe("edited");
  });

  // And the point of resetting: switching records must not carry the previous
  // record's edits onto the new one. This is the bug that would silently save
  // one outlet's address onto another.
  it("discards an edit when a dependency changes", () => {
    const { result, rerender } = renderHook(
      ({ dep }) => useResettableState([dep], () => `from-${dep}`),
      { initialProps: { dep: "a" } },
    );

    act(() => result.current[1]("edited"));
    rerender({ dep: "b" });

    expect(result.current[0]).toBe("from-b");
  });

  // Identity, not equality — the same rule an effect's dependency array uses.
  // React Query hands back a new object on every refetch, so this is what makes
  // "the server answered again" reset the form, exactly as the effect did.
  it("compares dependencies by identity, like an effect", () => {
    const first = { month: "2026-03" };
    const second = { month: "2026-03" };

    const { result, rerender } = renderHook(
      ({ dep }) => useResettableState([dep], () => dep),
      { initialProps: { dep: first } },
    );

    act(() => result.current[1]({ month: "edited" }));
    rerender({ dep: second });

    expect(result.current[0]).toBe(second);
  });

  // Several dependencies, any of which resets. PlanDetailPanel passes both the
  // rows and the plan id: a plan can change while its row array happens to be
  // identical, and the panel must still reset.
  it("resets when any one of several dependencies changes", () => {
    const { result, rerender } = renderHook(
      ({ a, b }) => useResettableState([a, b], () => `${a}-${b}`),
      { initialProps: { a: "x", b: 1 } },
    );

    act(() => result.current[1]("edited"));
    rerender({ a: "x", b: 2 });
    expect(result.current[0]).toBe("x-2");

    act(() => result.current[1]("edited again"));
    rerender({ a: "y", b: 2 });
    expect(result.current[0]).toBe("y-2");
  });

  // The updater form has to work, because half the call sites use it to change
  // one field of a form object.
  it("supports the functional updater", () => {
    const { result } = renderHook(() => useResettableState<number>(["k"], () => 1));

    act(() => result.current[1]((n) => n + 1));
    act(() => result.current[1]((n) => n + 1));

    expect(result.current[0]).toBe(3);
  });

  // Null is a real seeded value on every form that shows a skeleton until its
  // data arrives, and it must not be confused with "nothing computed yet".
  it("handles a null seed and the transition out of it", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useResettableState<{ id: string } | null>([data], () => data ?? null),
      { initialProps: { data: null as { id: string } | null } },
    );

    expect(result.current[0]).toBeNull();

    rerender({ data: { id: "loaded" } });
    expect(result.current[0]).toEqual({ id: "loaded" });
  });
});
