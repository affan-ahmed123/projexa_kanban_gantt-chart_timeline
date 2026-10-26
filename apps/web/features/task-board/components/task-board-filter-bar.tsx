"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import type { ReactElement } from "react";
import type { TaskStatus } from "@workspace/types";
import { clean, columns } from "../task-board.helpers";

type TaskBoardFilterBarProps = Readonly<{
  search: string;
  setSearch: (v: string) => void;
  assignee: string;
  setAssignee: (v: string) => void;
  assignees: readonly string[];
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  mobileColumnTab: "all" | TaskStatus;
  setMobileColumnTab: (tab: "all" | TaskStatus) => void;
  filteredCount: number;
  totalCount: number;
}>;

export const TaskBoardFilterBar = ({
  search,
  setSearch,
  assignee,
  setAssignee,
  assignees,
  statusFilter,
  setStatusFilter,
  hasActiveFilters,
  onResetFilters,
  mobileColumnTab,
  setMobileColumnTab,
  filteredCount,
  totalCount
}: TaskBoardFilterBarProps): ReactElement => {
  return (
    <>
      <section className="mb-5 sm:mb-6 flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white/95 p-3.5 shadow-xs backdrop-blur-md dark:border-[#20314a] dark:bg-[#121c2d] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-[220px] sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50/80 pl-8.5 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-1 focus:ring-cyan-400 dark:border-[#293d5c] dark:bg-[#172438] dark:text-white dark:placeholder:text-slate-400"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              type="search"
              value={search}
            />
            {search ? (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                onClick={() => setSearch("")}
                type="button"
              >
                ✕
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:border-[#293d5c] dark:bg-[#121c2d] dark:text-slate-400">
                /
              </kbd>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
              <select
                aria-label="Filter by member"
                className="h-9.5 w-full sm:w-[155px] appearance-none rounded-xl border border-slate-300 bg-slate-50/80 pl-8 pr-7 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer"
                onChange={(e) => setAssignee(e.target.value)}
                value={assignee}
              >
                <option value="">All Members ({assignees.length})</option>
                <option value="unassigned">Unassigned</option>
                {assignees.map((name) => (
                  <option key={name} value={name}>
                    {clean(name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                aria-label="Filter by status"
                className="h-9.5 w-full sm:w-[145px] appearance-none rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer"
                onChange={(e) => setStatusFilter(e.target.value)}
                value={statusFilter}
              >
                <option value="">All Statuses (4)</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-[#293d5c] dark:bg-[#172438] dark:text-slate-200 cursor-pointer w-full sm:w-auto"
              onClick={onResetFilters}
              title="Reset all filters"
              type="button"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredCount}</span> of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span> tasks
        </div>
      </section>

      <div className="mb-4 sm:hidden flex overflow-x-auto gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#101928] border border-slate-300 dark:border-slate-800">
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 ${
            mobileColumnTab === "all"
              ? "bg-white text-slate-900 shadow-2xs font-semibold dark:bg-[#182338] dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          }`}
          onClick={() => setMobileColumnTab("all")}
          type="button"
        >
          All Stages
        </button>
        {columns.map((c) => (
          <button
            className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 ${
              mobileColumnTab === c.status
                ? "bg-white text-slate-900 shadow-2xs font-semibold dark:bg-[#182338] dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
            key={c.status}
            onClick={() => setMobileColumnTab(c.status)}
            type="button"
          >
            {c.title}
          </button>
        ))}
      </div>
    </>
  );
};
