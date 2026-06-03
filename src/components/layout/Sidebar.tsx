"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Search,
  Upload,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Cpu,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getPrograms, getCoursesByProgram } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import type { Program } from "@/types/api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

function ProgramTreeItem({ program }: { program: Program }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: courses } = useQuery({
    queryKey: queryKeys.courses.byProgram(program.id),
    queryFn: () => getCoursesByProgram(program.id),
    enabled: isOpen,
  });

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <GraduationCap className="h-3 w-3 shrink-0" />
        <span className="truncate">{program.name}</span>
      </button>
      {isOpen && courses && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Video className="h-3 w-3 shrink-0" />
              <span className="truncate">{course.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  className?: string;
}

export function SidebarContent({ className }: SidebarContentProps) {
  const pathname = usePathname();
  const isFacultyAdminOrAbove = useAuthStore((s) => s.isFacultyAdminOrAbove());
  const { data: programs } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
  });

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" />
          <span>GDS Learn</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  size="sm"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {isFacultyAdminOrAbove && (
          <>
            <Separator className="my-4" />
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            <Link href="/admin/gpu-queue">
              <Button
                variant={pathname.startsWith("/admin/gpu-queue") ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                size="sm"
              >
                <Cpu className="h-4 w-4" />
                GPU Queue
              </Button>
            </Link>
          </>
        )}

        {programs && programs.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Programs
            </div>
            <div className="space-y-0.5">
              {programs.map((program) => (
                <ProgramTreeItem key={program.id} program={program} />
              ))}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background">
      <SidebarContent />
    </aside>
  );
}
