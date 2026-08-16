/**
 * The backend list-query convention, in one place.
 *
 * Every collection endpoint takes the same parameters, so this is the only file
 * that should know how they are spelled. Feature modules pass a typed object;
 * nothing else builds `filter[field][op]` by hand.
 *
 * Full rules: fortius-backend/docs/list-query-convention.md
 */

export type FilterOperator =
  | "eq"
  | "ne"
  | "contains"
  | "prefix"
  | "suffix"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_null";

export type SortDirection = "asc" | "desc";

export interface SortSpec {
  field: string;
  direction?: SortDirection;
}

export interface FilterSpec {
  field: string;
  operator: FilterOperator;
  /** `in` takes a comma-separated list; everything else takes one value. */
  value: string | number | boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: SortSpec[];
  filters?: FilterSpec[];
  /**
   * One free-text term, matched across whatever columns the resource declares
   * searchable. Capped at 128 characters by the server.
   *
   * Search is not a filter: a filter names one field and one operator, search
   * means "find this anywhere sensible". Sending a term to a resource that
   * declares no searchable columns is refused with 422 rather than ignored.
   */
  search?: string;
}

/** The server's cap. Trimming here gives a better message than a 422 round trip. */
export const MAX_SEARCH_LENGTH = 128;

/**
 * Builds the query string for a list request.
 *
 * Empty, blank and undefined values are omitted rather than sent empty: an
 * empty `search=` is a no-op on the server, but sending it makes request logs
 * and cache keys differ for identical queries.
 */
export function buildListQuery(params: ListParams = {}): URLSearchParams {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("page_size", String(params.pageSize));

  const search = params.search?.trim();
  if (search) query.set("search", search.slice(0, MAX_SEARCH_LENGTH));

  // `-field` is descending; ascending is the bare name. Multiple sorts are
  // comma-separated and applied in order, which is how a list stays stable when
  // the first key ties.
  if (params.sort?.length) {
    query.set(
      "sort",
      params.sort
        .map(({ field, direction }) => (direction === "desc" ? `-${field}` : field))
        .join(","),
    );
  }

  // URLSearchParams encodes the brackets; the server decodes them before
  // matching, so `filter[status][eq]` arrives intact.
  for (const { field, operator, value } of params.filters ?? []) {
    query.append(`filter[${field}][${operator}]`, String(value));
  }

  return query;
}

/** Convenience: the query string, with a leading `?` when non-empty. */
export function listQueryString(params: ListParams = {}): string {
  const query = buildListQuery(params).toString();
  return query ? `?${query}` : "";
}
