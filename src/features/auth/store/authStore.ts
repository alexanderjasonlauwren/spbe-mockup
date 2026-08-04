import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDb, latency, mutate } from "@/mocks/db";
import { PERMISSIONS } from "@/features/rbac/permissions";
import type { User, UserRole } from "@/types/auth";

/**
 * What each role may do. The console reads these to hide actions a user cannot
 * complete, rather than letting them fail at the point of submission.
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.SA_VIEW,
    PERMISSIONS.SA_CREATE,
    PERMISSIONS.SA_EDIT,
    PERMISSIONS.SA_IMPORT,
    PERMISSIONS.DISTRIBUTION_VIEW,
    PERMISSIONS.DISTRIBUTION_CREATE,
    PERMISSIONS.DISTRIBUTION_EDIT,
    PERMISSIONS.DISTRIBUTION_DELETE,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.DRIVERS_ASSIGN,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  finance: [
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_VERIFY,
    PERMISSIONS.SA_VIEW,
    PERMISSIONS.DISTRIBUTION_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  staff: [
    PERMISSIONS.SA_VIEW,
    PERMISSIONS.DISTRIBUTION_VIEW,
    PERMISSIONS.DISTRIBUTION_CREATE,
    PERMISSIONS.DISTRIBUTION_EDIT,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.DRIVERS_ASSIGN,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  viewer: [
    PERMISSIONS.SA_VIEW,
    PERMISSIONS.DISTRIBUTION_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.DRIVERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  driver: [PERMISSIONS.DISTRIBUTION_VIEW, PERMISSIONS.ORDERS_VIEW],
};

/** Stand-in for the password a real deployment would check against a hash. */
const DEMO_PASSWORD = "sidistrib";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

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
        await latency("write");

        if (!email.trim()) throw new Error("Masukkan alamat email Anda.");
        if (password.length < 6) {
          throw new Error("Kata sandi minimal 6 karakter.");
        }

        const account = getDb().users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        );

        if (!account) {
          throw new Error(
            `Tidak ada akun terdaftar dengan email ${email.trim()}. Periksa kembali, atau hubungi admin agen Anda.`,
          );
        }
        if (password !== DEMO_PASSWORD) {
          throw new Error("Kata sandi salah. Untuk data contoh, gunakan “sidistrib”.");
        }
        if (account.status === "Nonaktif") {
          throw new Error(
            `Akun ${account.nama} dinonaktifkan. Minta admin mengaktifkannya kembali di halaman Pengguna & Akses.`,
          );
        }

        const user: User = {
          id: account.id,
          email: account.email,
          name: account.nama,
          role: account.role,
          permissions: ROLE_PERMISSIONS[account.role] ?? [],
          branch: account.cabang,
          phone: account.telepon,
        };

        const token = `mock-jwt-${account.id}-${Date.now()}`;

        // Signing in is itself a recorded event, and flips an invited account
        // to active — the same thing a real backend would do.
        mutate((db) => {
          const row = db.users.find((u) => u.id === account.id);
          if (row) {
            row.terakhirMasuk = new Date().toISOString();
            if (row.status === "Diundang") row.status = "Aktif";
          }
        });

        set({ user, token, isAuthenticated: true });
        localStorage.setItem("auth_token", token);
      },

      logout: () => {
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true });
        localStorage.setItem("auth_token", token);
      },

      hasPermission: (permission: string) =>
        get().user?.permissions.includes(permission) ?? false,

      hasRole: (roles: UserRole | UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return (Array.isArray(roles) ? roles : [roles]).includes(user.role);
      },
    }),
    { name: "auth-storage" },
  ),
);
