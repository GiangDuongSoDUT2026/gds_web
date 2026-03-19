"use client";

import Link from "next/link";
import { CheckCircle2, Circle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useJobPolling } from "@/hooks/useJobPolling";
import type { JobStatusValue } from "@/types/api";
import { cn } from "@/lib/utils";

interface ProcessingStatusProps {
  taskId: string;
  lectureId: string;
}

interface PipelineStage {
  key: JobStatusValue;
  label: string;
  description: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { key: "PENDING", label: "Queued", description: "Waiting to start" },
  { key: "STARTED", label: "Processing", description: "Pipeline running" },
  { key: "SUCCESS", label: "Completed", description: "All done" },
];

// Maps the raw job status to a completion percentage for the progress bar
const STATUS_PROGRESS: Record<JobStatusValue, number> = {
  PENDING: 5,
  STARTED: 50,
  RETRY: 40,
  SUCCESS: 100,
  FAILURE: 0,
};

function StageIcon({
  stageDone,
  isCurrent,
  isFailed,
}: {
  stageDone: boolean;
  isCurrent: boolean;
  isFailed?: boolean;
}) {
  if (isFailed) return <XCircle className="h-5 w-5 text-destructive" />;
  if (stageDone) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (isCurrent) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

export function ProcessingStatus({ taskId, lectureId }: ProcessingStatusProps) {
  const { status, isSuccess, isFailure, error, isLoading } =
    useJobPolling(taskId);

  const progress = status ? STATUS_PROGRESS[status] : 0;

  const getStageState = (stageKey: JobStatusValue) => {
    if (!status) return { done: false, current: false };
    const stageOrder = ["PENDING", "STARTED", "SUCCESS"];
    const statusIndex = stageOrder.indexOf(status === "RETRY" ? "STARTED" : status);
    const stageIndex = stageOrder.indexOf(stageKey);
    return {
      done: statusIndex > stageIndex || (status === "SUCCESS" && stageKey === "SUCCESS"),
      current: stageIndex === statusIndex && status !== "FAILURE",
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Processing Lecture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {isLoading && !status
                ? "Starting..."
                : status === "FAILURE"
                ? "Failed"
                : status === "SUCCESS"
                ? "Completed"
                : status === "RETRY"
                ? "Retrying..."
                : "Processing..."}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress
            value={progress}
            className={cn(
              "h-2",
              isFailure && "bg-destructive/20",
              isSuccess && "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* Pipeline stages */}
        <div className="space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const { done, current } = getStageState(stage.key);
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <StageIcon
                  stageDone={done}
                  isCurrent={current}
                  isFailed={isFailure && current}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !done && !current && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {isFailure && error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* View lecture button on success */}
        {isSuccess && (
          <Button asChild className="w-full gap-2">
            <Link href={`/lectures/${lectureId}`}>
              <ExternalLink className="h-4 w-4" />
              View Lecture
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
