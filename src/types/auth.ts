export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
