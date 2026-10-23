"use client";

import type { Task } from "@workspace/types";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { dateLabel, getTaskStyle, ROW_HEIGHT, TASK_STATUS_CLASSES, type Gesture } from "../gantt-chart.helpers";
import { toUtcDay, type GanttWindow } from "../gantt-chart.service";

type GanttTaskBarProps = Readonly<{
  task: Task;
  row: number;
  layout: Readonly<{ left: number; width: number }>;
  dates: Readonly<{ startDate: string; dueDate: string }>;
  onBeginGesture: (event: ReactPointerEvent<HTMLButtonElement>, task: Task, mode: Gesture["mode"]) => void;
  onDragSource: (event: ReactDragEvent<HTMLButtonElement>, task: Task) => void;
  onDropDependency: (event: ReactDragEvent<HTMLButtonElement>, task: Task) => void;
}>;

export const GanttTaskBar = ({
  task,
  row,
  layout,
  dates,
  onBeginGesture,
  onDragSource,
  onDropDependency
}: GanttTaskBarProps): ReactElement => {
  const isLate =
    task.status !== "done" &&
    task.dueDate !== null &&
    toUtcDay(task.dueDate) < toUtcDay(new Date().toISOString());

  return (
    <div
      className="absolute z-30 h-7 rounded-lg"
      style={{ left: layout.left, top: row * ROW_HEIGHT + 14, width: layout.width }}
    >
      <button
        aria-label={`Move ${task.title}`}
        className={`absolute inset-0 cursor-grab rounded-lg text-left text-xs font-medium shadow-2xs active:cursor-grabbing ${TASK_STATUS_CLASSES[task.status]} ${
          isLate ? "border-2 border-rose-500" : ""
        }`}
        onPointerDown={(event) => onBeginGesture(event, task, "move")}
        style={getTaskStyle(task.status, isLate)}
        title={`${task.title}: ${dateLabel(dates.startDate)} – ${dateLabel(dates.dueDate)}`}
        type="button"
      >
        <div className="flex h-full items-center justify-between gap-2 px-2.5">
          <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{task.title}</span>
          <span className="shrink-0 text-[10px] font-medium opacity-80">
            {dateLabel(dates.startDate)} – {dateLabel(dates.dueDate)}
          </span>
        </div>
      </button>

      <button
        aria-label={`Resize ${task.title} start`}
        className="absolute -left-1 top-0 z-10 h-7 w-2 cursor-ew-resize rounded-l bg-white/70 dark:bg-slate-700/70 touch-none hover:bg-white"
        onPointerDown={(event) => onBeginGesture(event, task, "start")}
        type="button"
      />

      <button
        aria-label={`Resize ${task.title} end`}
        className="absolute -right-1 top-0 z-10 h-7 w-2 cursor-ew-resize rounded-r bg-white/70 dark:bg-slate-700/70 touch-none hover:bg-white"
        onPointerDown={(event) => onBeginGesture(event, task, "end")}
        type="button"
      />

      <button
        aria-label={`Create dependency from ${task.title}`}
        className="absolute -right-2 top-1/2 z-40 size-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-slate-900 dark:border-slate-900 dark:bg-white"
        draggable
        onDragStart={(event) => onDragSource(event, task)}
        title="Drag to a task to create a dependency"
        type="button"
      />

      <button
        aria-label={`Add dependency to ${task.title}`}
        className="absolute -left-2 top-1/2 z-40 size-3 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900 dark:bg-slate-500"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => onDropDependency(event, task)}
        title="Drop a predecessor here"
        type="button"
      />
    </div>
  );
};
