"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { TopNav } from "@/components/layout/TopNav";
import { useAuthStore } from "@/store/useAuthStore";

// Pages with no shell at all (standalone layouts)
const SHELL_LESS_PATHS = ["/login", "/register"];

// DEMO MODE: no auth required for any page
const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@gds.edu.vn",
  full_name: "Demo Teacher",
  role: "TEACHER" as const,
  organization_id: null,
  faculty: null,
  department: null,
  teacher_code: "DEMO01",
  major: null,
  student_code: null,
  is_active: true,
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, setAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Auto-login demo user if not authenticated
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated()) {
      setAuth(DEMO_USER, {
        access_token: "demo-token",
        refresh_token: "demo-refresh",
        token_type: "bearer",
      });
    }
  }, [hydrated, isAuthenticated, setAuth]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Login / register: no shell
  if (SHELL_LESS_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // All pages: render with shell
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
