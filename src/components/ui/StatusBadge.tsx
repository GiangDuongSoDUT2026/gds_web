import { Badge } from "@/components/ui/badge";
import type { LectureStatus, JobStatusValue } from "@/types/api";

type StatusValue = LectureStatus | JobStatusValue;

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusValue,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  DOWNLOADING: { label: "Downloading", variant: "info" },
  SCENE_DETECTING: { label: "Detecting Scenes", variant: "info" },
  ASR: { label: "Transcribing", variant: "info" },
  OCR: { label: "OCR", variant: "info" },
  EMBEDDING: { label: "Embedding", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
  STARTED: { label: "Processing", variant: "info" },
  SUCCESS: { label: "Success", variant: "success" },
  FAILURE: { label: "Failed", variant: "destructive" },
  RETRY: { label: "Retrying", variant: "warning" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "secondary" as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
