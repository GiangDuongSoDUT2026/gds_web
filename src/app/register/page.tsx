"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { register as registerUser, getOrganizations } from "@/lib/api";
import type { UserRole } from "@/types/api";

const schema = z.object({
  full_name: z.string().min(2, "Tên quá ngắn"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Ít nhất 6 ký tự"),
  role: z.enum(["STUDENT", "TEACHER"]),
  organization_id: z.string().optional(),
  // Student fields
  student_code: z.string().optional(),
  major: z.string().optional(),
  // Teacher fields
  faculty: z.string().optional(),
  department: z.string().optional(),
  teacher_code: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STUDENT" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await registerUser({ ...values, role: values.role as UserRole });
      toast.success("Tạo tài khoản thành công! Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Tham gia Hệ thống Giảng Đường Số</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Basic info */}
            <div className="space-y-1">
              <Label>Họ và tên *</Label>
              <Input placeholder="Nguyễn Văn A" {...register("full_name")} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Mật khẩu *</Label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Separator />

            {/* Role selection */}
            <div className="space-y-1">
              <Label>Vai trò *</Label>
              <Select
                defaultValue="STUDENT"
                onValueChange={(v) => {
                  const r = v as "STUDENT" | "TEACHER";
                  setRole(r);
                  setValue("role", r);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Sinh viên</SelectItem>
                  <SelectItem value="TEACHER">Giảng viên</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Organization (both roles) */}
            {orgs.length > 0 && (
              <div className="space-y-1">
                <Label>Trường / Đại học</Label>
                <Select onValueChange={(v) => setValue("organization_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trường..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Student-specific fields */}
            {role === "STUDENT" && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Thông tin sinh viên</p>
                <div className="space-y-1">
                  <Label>Mã sinh viên</Label>
                  <Input placeholder="VD: 20210001" {...register("student_code")} />
                </div>
                <div className="space-y-1">
                  <Label>Ngành học</Label>
                  <Input placeholder="VD: Công nghệ thông tin" {...register("major")} />
                </div>
              </div>
            )}

            {/* Teacher-specific fields */}
            {role === "TEACHER" && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Thông tin giảng viên</p>
                <div className="space-y-1">
                  <Label>Mã giảng viên</Label>
                  <Input placeholder="VD: GV0042" {...register("teacher_code")} />
                </div>
                <div className="space-y-1">
                  <Label>Khoa</Label>
                  <Input placeholder="VD: Khoa Công nghệ thông tin" {...register("faculty")} />
                </div>
                <div className="space-y-1">
                  <Label>Bộ môn</Label>
                  <Input placeholder="VD: Bộ môn Kỹ thuật phần mềm" {...register("department")} />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tạo tài khoản
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-primary hover:underline">Đăng nhập</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
