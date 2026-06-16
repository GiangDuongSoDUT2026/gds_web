import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, TokenResponse, UserRole } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, tokens: TokenResponse) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isTeacherOrAbove: () => boolean;
  isFacultyAdminOrAbove: () => boolean;
  isSchoolAdminOrAbove: () => boolean;
  isSuperAdmin: () => boolean;
}

const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  SCHOOL_ADMIN: 4,
  FACULTY_ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tokens) => {
        document.cookie = `access_token=${tokens.access_token}; path=/; max-age=86400; SameSite=Lax`;
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        document.cookie = "access_token=; path=/; max-age=0";
        set({ user: null, accessToken: null, refreshToken: null });
      },
      isAuthenticated: () => !!get().accessToken && !!get().user,
      hasRole: (...roles) => {
        const user = get().user;
        return !!user && roles.includes(user.role);
      },
      isTeacherOrAbove: () => {
        const user = get().user;
        return !!user && ROLE_LEVEL[user.role] >= 2;
      },
      isFacultyAdminOrAbove: () => {
        const user = get().user;
        return !!user && ROLE_LEVEL[user.role] >= 3;
      },
      isSchoolAdminOrAbove: () => {
        const user = get().user;
        return !!user && ROLE_LEVEL[user.role] >= 4;
      },
      isSuperAdmin: () => get().user?.role === "SUPER_ADMIN",
    }),
    {
      name: "gds-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
