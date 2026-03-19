"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUPER_ADMIN: "destructive",
  SCHOOL_ADMIN: "default",
  FACULTY_ADMIN: "default",
  TEACHER: "secondary",
  STUDENT: "outline",
};

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={() => router.push("/login")}>
        Sign In
      </Button>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline max-w-32 truncate">{user.full_name}</span>
          <Badge
            variant={ROLE_COLORS[user.role] ?? "outline"}
            className="text-xs"
          >
            {user.role.replace("_", " ")}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{user.full_name}</p>
            <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.faculty && (
          <DropdownMenuItem disabled>
            <Shield className="h-4 w-4 mr-2" />
            {user.faculty}
          </DropdownMenuItem>
        )}
        {user.student_code && (
          <DropdownMenuItem disabled className="text-xs">
            Mã SV: {user.student_code}
          </DropdownMenuItem>
        )}
        {user.major && (
          <DropdownMenuItem disabled className="text-xs">
            Ngành: {user.major}
          </DropdownMenuItem>
        )}
        {user.teacher_code && (
          <DropdownMenuItem disabled className="text-xs">
            Mã GV: {user.teacher_code}
          </DropdownMenuItem>
        )}
        {user.department && (
          <DropdownMenuItem disabled className="text-xs">
            Bộ môn: {user.department}
          </DropdownMenuItem>
        )}
        {(user.faculty || user.department || user.major || user.student_code || user.teacher_code) && (
          <DropdownMenuSeparator />
        )}
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
