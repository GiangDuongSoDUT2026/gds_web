"use client";

import { ExternalLink } from "lucide-react";

export function KaggleGuide() {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
      <p className="font-medium">Cách bật GPU Kaggle</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>
          Mở{" "}
          <a
            href="https://www.kaggle.com/kernels"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-0.5"
          >
            kaggle.com/kernels
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
        <li>Chọn notebook <strong>gds_pipeline</strong></li>
        <li>
          Settings → Accelerator → <strong>GPU T4 x2</strong>
        </li>
        <li>Run All Cells</li>
        <li>Backend tự nhận session sau ~60 giây</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Kaggle: 30h GPU/tuần. Colab: 20h/tuần. Luân phiên để tối đa quota.
      </p>
    </div>
  );
}
