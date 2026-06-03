"use client";

import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, Home, MessageSquare } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isChat = pathname === "/chat";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
      {/* Left: Logo — fixed width to balance right side */}
      <div className="flex items-center gap-2 w-36">
        <GraduationCap className="h-6 w-6 text-primary shrink-0" />
        <span className="font-semibold text-base hidden sm:block">GDS Learn</span>
      </div>

      {/* Center: Tab switcher — absolutely centered */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => router.push("/")}
            className={`flex items-center gap-1.5 px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              !isChat
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Main</span>
          </button>
          <button
            onClick={() => router.push("/chat")}
            className={`flex items-center gap-1.5 px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isChat
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Right: UserMenu — same fixed width as left to keep tabs centered */}
      <div className="flex items-center justify-end w-36">
        <UserMenu />
      </div>
    </header>
  );
}
