import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        password = "mock-password"; // Mock password for demonstration
        if (!password) {
          throw new Error("Invalid email or password");
        }
        try {
          // TODO: Replace with actual API call
          // Mock login for now
          const mockUser: User = {
            id: "1",
            email: email,
            name: "Alex Lawrence",
            role: "admin", // Change to 'manager', 'staff', or 'viewer' to test RBAC
            permissions: [
              "users:view",
              "users:create",
              "users:edit",
              "users:delete",
              "products:view",
              "products:create",
              "products:edit",
              "products:delete",
              "sa:view",
              "sa:create",
              "sa:edit",
              "sa:import",
              "distribution:view",
              "distribution:create",
              "distribution:edit",
              "distribution:delete",
              "payments:view",
              "payments:create",
              "payments:verify",
              "drivers:view",
              "drivers:assign",
              "drivers:manage",
              "orders:view",
              "orders:create",
              "orders:edit",
              "orders:delete",
              "reports:view",
              "reports:export",
              "settings:view",
              "settings:edit",
            ],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent("Alex Lawrence")}&background=3b82f6&color=fff`,
          };

          const mockToken = "mock-jwt-token-" + Date.now();

          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
          });

          localStorage.setItem("auth_token", mockToken);
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("auth_token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true });
        localStorage.setItem("auth_token", token);
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        return user?.permissions.includes(permission) ?? false;
      },

      hasRole: (roles: UserRole | UserRole[]) => {
        const { user } = get();
        if (!user) return false;

        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
