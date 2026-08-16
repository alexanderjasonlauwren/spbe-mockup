import axios, { AxiosError } from "axios";

import { listQueryString, type ListParams } from "./listQuery";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

/* ------------------------------------------------------------------------- *
 * Response envelope
 *
 * The backend wraps every response. The envelope is worth keeping — request_id
 * is what turns "it broke" into a log line — but no feature module should ever
 * see it. Unwrapping happens here, once, so components work with plain data.
 * ------------------------------------------------------------------------- */

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** One field-level validation failure, as returned in error.details. */
export interface Violation {
  field: string;
  rule: string;
  message: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  timestamp: string;
  request_id: string;
  data: T;
  pagination?: Pagination;
  error?: { code: string; details?: Violation[] };
}

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * An error carrying what the server actually said.
 *
 * `code` is the stable string to branch on — never the message, which is
 * user-facing prose and will be translated. `STALE_VERSION` in particular means
 * the record moved under the user: reload and let them redo the edit, rather
 * than showing a generic failure.
 *
 * `requestId` should appear in any error surface a user can screenshot. It is
 * the only thing that finds the matching server log.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly violations: Violation[];

  constructor(init: {
    message: string;
    code: string;
    status?: number;
    requestId?: string;
    violations?: Violation[];
  }) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.violations = init.violations ?? [];
  }
}

function toApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError<Envelope<unknown>>;
  const envelope = axiosError.response?.data;

  if (envelope && typeof envelope === "object" && "success" in envelope) {
    return new ApiError({
      message: envelope.message || "Request failed",
      code: envelope.error?.code ?? "UNKNOWN",
      status: axiosError.response?.status,
      requestId: envelope.request_id,
      violations: envelope.error?.details,
    });
  }

  // No envelope: the request never reached the API (network, timeout, proxy).
  return new ApiError({
    message: axiosError.message || "Network error",
    code: "NETWORK",
    status: axiosError.response?.status,
  });
}

/** GET one resource, unwrapped. */
export async function getOne<T>(path: string): Promise<T> {
  try {
    const response = await apiClient.get<Envelope<T>>(path);
    return response.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * GET a collection using the shared list convention.
 *
 * Pagination is returned alongside the items rather than discarded: a list that
 * throws away total_items cannot render a pager, and every caller that needs
 * one ends up refetching to count.
 */
export async function getList<T>(path: string, params: ListParams = {}): Promise<Page<T>> {
  try {
    const response = await apiClient.get<Envelope<T[]>>(`${path}${listQueryString(params)}`);
    const { data, pagination } = response.data;
    return {
      items: data ?? [],
      pagination: pagination ?? {
        page: 1,
        page_size: data?.length ?? 0,
        total_items: data?.length ?? 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
  } catch (error) {
    throw toApiError(error);
  }
}

/** POST / PUT / DELETE, unwrapped. */
export async function send<T>(
  method: "post" | "put" | "patch" | "delete",
  path: string,
  body?: unknown,
): Promise<T> {
  try {
    const response = await apiClient.request<Envelope<T>>({ method, url: path, data: body });
    return response.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}
