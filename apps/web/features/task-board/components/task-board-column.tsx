"use client";

import type { Task, TaskStatus } from "@workspace/types";
import { Inbox } from "lucide-react";
import type { DragEvent, ReactElement } from "react";
import type { Column } from "../task-board.helpers";
import { TaskBoardCard } from "./task-board-card";

type TaskColumnProps = Readonly<{
  column: Column;
  tasks: readonly Task[];
  totalTasks: number;
  remove: (id: string) => Promise<void>;
  drop: (e: DragEvent<HTMLElement>, s: TaskStatus) => void;
  isDragOver: boolean;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  isSingleMobileView?: boolean;
  currentMemberName?: string | undefined;
  currentUserEmail?: string | undefined;
  isTeamLead: boolean;
}>;

export const TaskBoardColumn = ({
  column,
  tasks,
  totalTasks,
  remove,
  drop,
  isDragOver,
  onDragOver,
  onDragLeave,
  onStatusChange,
  isSingleMobileView = false,
  currentMemberName,
  currentUserEmail,
  isTeamLead
}: TaskColumnProps): ReactElement => {
  const pct = totalTasks > 0 ? Math.round((tasks.length / totalTasks) * 100) : 0;

  return (
    <section
      className={`group/col relative flex ${
        isSingleMobileView
          ? "w-full"
          : "w-[86vw] max-w-[340px] shrink-0 snap-center sm:w-auto sm:max-w-none"
      } min-h-[540px] flex-col rounded-2xl border bg-slate-100/60 p-3.5 shadow-2xs transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 duration-300 ${
        column.delayClass
      } dark:border-[#20314a] dark:bg-[#121c2d] ${
        isDragOver
          ? "border-slate-500 bg-slate-200/60 ring-2 ring-slate-400/30 dark:border-blue-500 dark:bg-blue-950/20"
          : "border-slate-300 hover:border-slate-400 dark:border-[#20314a] dark:hover:border-[#2f466b]"
      }`}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={(e) => drop(e, column.status)}
    >
      <div
        className={`hidden dark:block h-1 w-10 rounded-full mb-2.5 opacity-90 ${
          column.status === "todo"
            ? "bg-gradient-to-r from-blue-500 to-indigo-500"
            : column.status === "in_progress"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : column.status === "review"
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-purple-500 to-fuchsia-500"
        }`}
      />

      <header className="mb-3 flex items-center justify-between rounded-xl bg-white/90 dark:bg-[#172438] border border-slate-300 dark:border-[#293d5c] px-2.5 py-1.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${column.dotColor}`} />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{column.title}</h2>
          <span className="rounded-full bg-slate-100 dark:bg-[#0f1724] px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700">
            {tasks.length}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">{pct}%</span>
      </header>

      {isDragOver && (
        <div className="mb-2 flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-200/50 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-150">
          Drop to set as {column.title}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        {!tasks.length && !isDragOver && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-300 dark:border-slate-700">
              <Inbox className="size-4" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No {column.title} tasks</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Drag or move tasks here</p>
          </div>
        )}
        {tasks.map((task) => (
          <TaskBoardCard
            currentMemberName={currentMemberName}
            currentUserEmail={currentUserEmail}
            isTeamLead={isTeamLead}
            key={task.id}
            onStatusChange={onStatusChange}
            remove={remove}
            task={task}
          />
        ))}
      </div>
    </section>
  );
};
