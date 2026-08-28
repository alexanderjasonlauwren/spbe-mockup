import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Local state that resets when the value it was seeded from changes.
 *
 * The shape this replaces, which appeared ten times in this console:
 *
 * ```tsx
 * const [form, setForm] = useState(null);
 * useEffect(() => {
 *   if (data) setForm({ ...data });
 * }, [data]);
 * ```
 *
 * That works, but it renders twice for every change: once with the stale
 * value, then again after the effect commits. On a form the user sees the
 * previous record's fields for a frame while switching between two, and on a
 * list the row highlight jumps. React's own guidance is to make this
 * adjustment *during* render rather than after it — `setState` called while
 * rendering re-runs the component immediately, before anything is painted, so
 * the stale frame never exists.
 *
 * It is also what `react-hooks/set-state-in-effect` asks for, and that rule was
 * firing on all ten sites.
 *
 * `deps` is compared element-wise with `Object.is`, exactly like an effect's
 * dependency array, so moving an existing effect here is a mechanical change:
 * the same deps produce the same resets.
 *
 * @param deps    when any of these changes identity, the state is recomputed
 * @param compute produces the fresh value; called on mount and on every reset
 *
 * @example
 * const [form, setForm] = useResettableState(
 *   [config.data],
 *   () => (config.data ? { ...config.data.penomoran } : null),
 * );
 */
export function useResettableState<T>(
  deps: readonly unknown[],
  compute: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [seed, setSeed] = useState(deps);
  const [value, setValue] = useState<T>(compute);

  if (seed.length !== deps.length || deps.some((dep, i) => !Object.is(dep, seed[i]))) {
    setSeed(deps);
    setValue(compute);
  }

  return [value, setValue];
}
