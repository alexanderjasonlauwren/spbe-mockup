export type UserRole = "admin" | "manager" | "finance" | "driver" | "staff" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  branch?: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
