export type UserRole =
  | "admin"
  | "manager"
  | "finance"
  | "driver"
  | "staff"
  | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  branch?: string;
  /** Branches this user may read. Empty = every branch (tenant-wide scope). */
  branchIds?: string[];
  /** Mirrors iam.user_roles.scope_type on the backend. */
  scopeType?: "global" | "tenant" | "branch" | "outlet";
  phone?: string;
  /** Set for `driver` accounts: the fleet record this user drives. */
  driverId?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
