"use client";

import { useQuery } from "@tanstack/react-query";
import { getJob } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { JobStatusValue } from "@/types/api";

const TERMINAL_STATUSES: JobStatusValue[] = ["SUCCESS", "FAILURE"];

export interface UseJobPollingResult {
  status: JobStatusValue | undefined;
  isComplete: boolean;
  isSuccess: boolean;
  isFailure: boolean;
  error: string | null;
  isLoading: boolean;
}

/**
 * Polls job status every 3 seconds until a terminal state is reached.
 */
export function useJobPolling(
  taskId: string | null
): UseJobPollingResult {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.jobs.detail(taskId ?? ""),
    queryFn: () => getJob(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3_000;
      if (TERMINAL_STATUSES.includes(status)) return false;
      return 3_000;
    },
    staleTime: 0,
  });

  const status = data?.status;
  const isComplete = !!status && TERMINAL_STATUSES.includes(status);
  const isSuccess = status === "SUCCESS";
  const isFailure = status === "FAILURE";
  const error = data?.error ?? null;

  return { status, isComplete, isSuccess, isFailure, error, isLoading };
}
