"use client";

import type { Task } from "@workspace/types";
import { Fragment, type DragEvent as ReactDragEvent, type ReactElement } from "react";
import { getAvatarColor } from "@/features/workspace-foundation";
import { toUtcDay, type GanttWindow, type GanttTick } from "@/features/gantt-chart";
import { getStackedTaskBarLayout, stackOverlappingTasks, type PersonRow, type PersonWorkload } from "../timeline.model";
import { dateLabel, getTaskStyle, TASK_STATUS_CLASSES } from "../timeline.helpers";

type TimelinePersonRowProps = Readonly<{
  row: PersonRow;
  ganttWindow: GanttWindow;
  ticks: readonly GanttTick[];
  workload: PersonWorkload | undefined;
  timelineWidth: number;
  todayX: number;
  dragOverRow: string | null;
  savingTaskId: string | null;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDragOver: (event: ReactDragEvent<HTMLElement>, personId: string | null) => void;
  onDragLeave: () => void;
  onDrop: (event: ReactDragEvent<HTMLElement>, personId: string | null) => void;
}>;

export const TimelinePersonRow = ({
  row,
  ganttWindow,
  ticks,
  workload,
  timelineWidth,
  todayX,
  dragOverRow,
  savingTaskId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: TimelinePersonRowProps): ReactElement => {
  const personId = row.person?.id ?? null;
  const stacked = stackOverlappingTasks(row.tasks, ganttWindow);
  const maxStack = stacked.reduce((acc, s) => Math.max(acc, s.stackIndex + 1), 1);
  const barHeight = maxStack > 1 ? 22 : 28;
  const gap = 4;
  const rowHeight = Math.max(76, maxStack * (barHeight + gap) + 16);

  const dropProps = {
    onDragLeave,
    onDragOver: (e: ReactDragEvent<HTMLElement>) => onDragOver(e, personId),
    onDrop: (e: ReactDragEvent<HTMLElement>) => onDrop(e, personId)
  };

  return (
    <Fragment>
      <div
        className={`sticky left-0 z-10 flex items-center border-b border-r border-slate-300 bg-white/95 px-4 transition-colors dark:border-slate-700 dark:bg-slate-900/95 ${
          dragOverRow === personId ? "bg-blue-50/60 dark:bg-blue-950/40" : ""
        }`}
        style={{ height: rowHeight }}
        {...dropProps}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {row.person ? (
            <>
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-2xs ring-1 ring-slate-300 dark:ring-slate-600"
                style={{
                  backgroundColor: getAvatarColor(row.person.name).bg,
                  color: getAvatarColor(row.person.name).text,
                  borderColor: getAvatarColor(row.person.name).border,
                  borderWidth: "1px"
                }}
              >
                {row.person.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                  {row.person.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {row.tasks.length} task{row.tasks.length !== 1 ? "s" : ""}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs font-medium text-slate-400 italic">Unassigned ({row.tasks.length})</div>
          )}
        </div>
      </div>

      <div
        className={`relative border-b border-slate-300 transition-colors dark:border-slate-700 ${
          dragOverRow === personId ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
        }`}
        style={{ height: rowHeight, width: timelineWidth }}
        {...dropProps}
      >
        {workload?.days.map((day, dayIndex) => (
          <div
            className={`absolute inset-y-0 ${
              day.isOverloaded
                ? "bg-rose-500/10 border-x border-rose-500/30"
                : day.taskCount > 0
                  ? "bg-blue-500/5"
                  : ""
            }`}
            key={day.date}
            style={{ left: dayIndex * ganttWindow.pixelsPerDay, width: ganttWindow.pixelsPerDay }}
            title={day.isOverloaded ? `Overloaded: ${day.taskCount} tasks (Limit: 2)` : undefined}
          />
        ))}

        {ticks.map((tick) => (
          <div
            className="absolute inset-y-0 border-r border-slate-200/50 dark:border-slate-800/50"
            key={tick.day}
            style={{ left: tick.x, width: 1 }}
          />
        ))}

        {todayX >= 0 && todayX <= timelineWidth && (
          <div
            aria-label="Today"
            className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            style={{ left: todayX }}
            title="Today"
          />
        )}

        {stacked
          .filter(({ task }) => task.startDate && task.dueDate)
          .map(({ task, stackIndex, totalInStack }) => {
            const layout = getStackedTaskBarLayout(task, ganttWindow, stackIndex, totalInStack);
            if (!layout) return null;
            const isSaving = savingTaskId === task.id;
            const isLate =
              task.status !== "done" &&
              task.dueDate !== null &&
              toUtcDay(task.dueDate) < toUtcDay(new Date().toISOString());
            return (
              <div
                className={`absolute cursor-move rounded-lg ${TASK_STATUS_CLASSES[task.status]} px-2.5 py-1 text-xs shadow-2xs transition-all ${
                  isSaving ? "opacity-50" : "hover:opacity-95 hover:shadow-xs active:cursor-grabbing"
                } ${isLate ? "border-2 border-rose-500" : ""}`}
                draggable={!isSaving}
                key={task.id}
                onDragEnd={onDragEnd}
                onDragStart={() => onDragStart(task)}
                style={{
                  ...getTaskStyle(task.status, isLate),
                  left: layout.left,
                  width: Math.max(layout.width, 40),
                  top: layout.top + 8,
                  height: layout.height
                }}
                title={`${task.title}\n${task.startDate ? dateLabel(task.startDate) : ""} – ${
                  task.dueDate ? dateLabel(task.dueDate) : ""
                }`}
              >
                <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{task.title}</div>
              </div>
            );
          })}
      </div>
    </Fragment>
  );
};
