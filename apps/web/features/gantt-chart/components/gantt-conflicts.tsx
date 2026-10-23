"use client";

import type { ScheduledTaskConflict } from "@workspace/types";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { ReactElement } from "react";
import { dateLabel } from "../gantt-chart.helpers";

type GanttConflictsProps = Readonly<{
  error: string | null;
  conflicts: readonly ScheduledTaskConflict[];
  onRetry: () => void;
}>;

export const GanttConflicts = ({ error, conflicts, onRetry }: GanttConflictsProps): ReactElement | null => {
  if (!error && conflicts.length === 0) return null;

  return (
    <>
      {error && (
        <div
          className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            className="inline-flex items-center gap-1 font-medium underline cursor-pointer"
            onClick={onRetry}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" /> Retry
          </button>
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className="mb-4 rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          <strong className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-4" /> Schedule conflict
          </strong>
          <ul className="mt-2 list-inside list-disc">
            {conflicts.map((conflict) => (
              <li key={conflict.taskId}>
                {conflict.title} moved past its prior deadline ({dateLabel(conflict.deadline)} →{" "}
                {dateLabel(conflict.rescheduledDueDate)}).
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
