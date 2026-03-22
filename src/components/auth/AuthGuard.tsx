"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { TopNav } from "@/components/layout/TopNav";
import { useAuthStore } from "@/store/useAuthStore";

// Pages with no shell at all (standalone layouts)
const SHELL_LESS_PATHS = ["/login", "/register"];

// Pages that require authentication — redirect to login if not logged in
const PROTECTED_PREFIXES = ["/chat", "/upload"];

function requiresAuth(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (SHELL_LESS_PATHS.includes(pathname)) return;
    if (requiresAuth(pathname) && !isAuthenticated()) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, pathname, isAuthenticated, router]);

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

  // Protected page but not authenticated: show spinner while redirect fires
  if (requiresAuth(pathname) && !isAuthenticated()) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // All other pages: render with shell (public OR authenticated)
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
