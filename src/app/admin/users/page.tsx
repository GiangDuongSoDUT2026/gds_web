"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: string; email: string; full_name: string;
  role: string; organization_id: string | null;
  faculty: string | null; is_active: boolean; created_at: string | null;
}

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  SCHOOL_ADMIN: "bg-orange-100 text-orange-700",
  FACULTY_ADMIN: "bg-yellow-100 text-yellow-700",
  TEACHER: "bg-blue-100 text-blue-700",
  STUDENT: "bg-gray-100 text-gray-700",
};

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/v1/admin/users?limit=200");
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <Badge variant="secondary">{users.length} tài khoản</Badge>
      </div>

      {/* Role summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(roleCounts).map(([role, count]) => (
          <span key={role} className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[role] ?? "bg-gray-100 text-gray-700"}`}>
            {role}: {count}
          </span>
        ))}
      </div>

      {/* User table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Họ tên</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Khoa</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{u.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ROLE_COLOR[u.role] ?? ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.faculty ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {u.is_active
                      ? <span className="text-xs text-green-600 font-medium">Active</span>
                      : <span className="text-xs text-red-500 font-medium">Inactive</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
