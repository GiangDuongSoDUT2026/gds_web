"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isFacultyAdminOrAbove = useAuthStore((s) => s.isFacultyAdminOrAbove());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isFacultyAdminOrAbove) {
      router.replace("/");
    }
  }, [isAuthenticated, isFacultyAdminOrAbove, router]);

  if (!isAuthenticated || !isFacultyAdminOrAbove) return null;

  return <>{children}</>;
}
