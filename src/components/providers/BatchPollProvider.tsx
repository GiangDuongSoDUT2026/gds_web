"use client";
import { useBatchPolling } from "@/hooks/useBatchPolling";

export function BatchPollProvider({ children }: { children: React.ReactNode }) {
  useBatchPolling();
  return <>{children}</>;
}
