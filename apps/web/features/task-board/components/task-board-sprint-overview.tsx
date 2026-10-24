"use client";

import { Lock, Plus } from "lucide-react";
import type { ReactElement } from "react";
import type { Task, TaskStatus } from "@workspace/types";

type TaskBoardSprintOverviewProps = Readonly<{
  tasks: readonly Task[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isTeamLead: boolean;
  memberRole?: string;
  onOpenQuickAdd: () => void;
  socketConnected?: boolean;
}>;

export const TaskBoardSprintOverview = ({
  tasks,
  statusFilter,
  onStatusFilterChange,
  isTeamLead,
  memberRole,
  onOpenQuickAdd,
  socketConnected = false
}: TaskBoardSprintOverviewProps): ReactElement => {
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const inReviewCount = tasks.filter((t) => t.status === "review").length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const donePct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const inProgressPct = tasks.length > 0 ? (inProgressCount / tasks.length) * 100 : 0;
  const inReviewPct = tasks.length > 0 ? (inReviewCount / tasks.length) * 100 : 0;

  return (
    <section className="mb-5 sm:mb-6 rounded-2xl border border-slate-300 bg-white/95 p-4 sm:p-5 shadow-xs backdrop-blur-md dark:border-[#20314a] dark:bg-[#121c2d] dark:shadow-none animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex flex-col gap-3.5 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Sprint Overview</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tasks.length === 0
                  ? "No tasks yet. Create your first task to start."
                  : `${completedCount} of ${tasks.length} completed (${completionRate}%) • ${inProgressCount} in progress, ${inReviewCount} in review`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {completionRate}%
              </span>
              <span className="ml-1 text-[11px] font-medium text-slate-400">done</span>
            </div>
          </div>

          <div
            className="relative h-2 w-full flex overflow-hidden rounded-full bg-slate-100 border border-slate-300/80 dark:bg-[#1a273b] dark:border-[#243550]"
            title="Sprint Progress"
          >
            {donePct > 0 && (
              <div
                className="h-full bg-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${donePct}%` }}
              />
            )}
            {inReviewPct > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-700 ease-out"
                style={{ width: `${inReviewPct}%` }}
              />
            )}
            {inProgressPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${inProgressPct}%` }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap shrink-0 items-center gap-2">
          {socketConnected && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/50 bg-emerald-500/10 px-2.5 py-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-2xs"
              title="Real-time WebSocket active: Instant sync with team members across browsers"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Live Sync</span>
            </span>
          )}

          {isTeamLead ? (
            <button
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:bg-slate-800 hover:shadow-md active:scale-98 dark:bg-[#202747] dark:text-indigo-200 dark:border dark:border-indigo-500/40 cursor-pointer"
              onClick={onOpenQuickAdd}
              type="button"
            >
              <Plus className="size-3.5" />
              <span>Create Task</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Lock className="size-3 text-amber-500" />
              <span>{memberRole || "Developer"} Mode (Drag & Drop Your Tasks)</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3.5 mt-3.5 border-t border-slate-200 dark:border-[#20314a] sm:grid-cols-4 sm:gap-2.5">
        <button
          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
            statusFilter === "todo"
              ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-[#101e33]"
              : "border-slate-300 bg-white/80 dark:border-blue-500/50 dark:bg-[#101e33]"
          }`}
          onClick={() => onStatusFilterChange(statusFilter === "todo" ? "" : "todo")}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-300 dark:bg-blue-500/20">
              <span className="size-2 rounded-full bg-blue-500" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">To Do</span>
              <span className="text-base font-bold text-slate-900 dark:text-white leading-tight">{todoCount}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            {tasks.length > 0 ? `${Math.round((todoCount / tasks.length) * 100)}%` : "0%"}
          </span>
        </button>

        <button
          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
            statusFilter === "in_progress"
              ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-[#0c2620]"
              : "border-slate-300 bg-white/80 dark:border-emerald-500/50 dark:bg-[#0c2620]"
          }`}
          onClick={() => onStatusFilterChange(statusFilter === "in_progress" ? "" : "in_progress")}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-300 dark:bg-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">In Progress</span>
              <span className="text-base font-bold text-slate-900 dark:text-white leading-tight">{inProgressCount}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            {tasks.length > 0 ? `${Math.round((inProgressCount / tasks.length) * 100)}%` : "0%"}
          </span>
        </button>

        <button
          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
            statusFilter === "review"
              ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30 dark:border-amber-400 dark:bg-[#261c0c]"
              : "border-slate-300 bg-white/80 dark:border-amber-500/50 dark:bg-[#261c0c]"
          }`}
          onClick={() => onStatusFilterChange(statusFilter === "review" ? "" : "review")}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-300 dark:bg-amber-500/20">
              <span className="size-2 rounded-full bg-amber-500" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">In Review</span>
              <span className="text-base font-bold text-slate-900 dark:text-white leading-tight">{inReviewCount}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            {tasks.length > 0 ? `${Math.round((inReviewCount / tasks.length) * 100)}%` : "0%"}
          </span>
        </button>

        <button
          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
            statusFilter === "done"
              ? "border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/30 dark:border-purple-400 dark:bg-[#21122e]"
              : "border-slate-300 bg-white/80 dark:border-purple-500/50 dark:bg-[#21122e]"
          }`}
          onClick={() => onStatusFilterChange(statusFilter === "done" ? "" : "done")}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-300 dark:bg-purple-500/20">
              <span className="size-2 rounded-full bg-purple-500" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">Completed</span>
              <span className="text-base font-bold text-slate-900 dark:text-white leading-tight">{completedCount}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            {tasks.length > 0 ? `${Math.round((completedCount / tasks.length) * 100)}%` : "0%"}
          </span>
        </button>
      </div>
    </section>
  );
};
