"use client";

import type { Task, TaskStatus } from "@workspace/types";
import { Calendar, Link2, Lock, Trash2 } from "lucide-react";
import { useState, type ReactElement } from "react";
import { getAvatarUrl } from "@/features/workspace-foundation/public";
import { clean, formatDate, isOverdue, statusBadgeConfig } from "../task-board.helpers";

type TaskCardProps = Readonly<{
  task: Task;
  remove: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: TaskStatus) => void;
  currentMemberName?: string | undefined;
  isTeamLead: boolean;
}>;

export const TaskBoardCard = ({
  task,
  remove,
  onStatusChange,
  currentMemberName,
  isTeamLead
}: TaskCardProps): ReactElement => {
  const [deleting, setDeleting] = useState(false);
  const cfg = statusBadgeConfig[task.status];
  const late = isOverdue(task);
  const hasMeta = Boolean(task.assigneeId || task.dueDate || (task.dependsOn && task.dependsOn.length > 0));
  const ticketKey = `#TASK-${task.id.replace(/[^0-9a-zA-Z]/g, "").slice(-3).toUpperCase() || "1"}`;

  const assignedClean = task.assigneeId ? clean(task.assigneeId).toLowerCase() : "";
  const isAssignedToMe = Boolean(
    currentMemberName && assignedClean && assignedClean === currentMemberName.toLowerCase()
  );

  const canMove = isTeamLead || isAssignedToMe;
  const canDelete = isTeamLead;

  return (
    <article
      className={`group/card relative rounded-xl border border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] hover:border-slate-400 active:scale-[0.99] dark:border-[#2b3e5e] dark:bg-[#182338] dark:hover:border-slate-500 ${
        canMove ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-90"
      } ${
        late ? "border-l-[3.5px] border-l-rose-500" : `border-l-[3.5px] ${cfg.accentBorder}`
      } ${task.status === "done" ? "opacity-75" : ""}`}
      draggable={canMove}
      onDragStart={(e) => {
        if (!canMove) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/task-id", task.id);
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
            {ticketKey}
          </span>
          <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>

          {canMove ? (
            <label className="relative inline-flex items-center cursor-pointer group/status" title="Click to change status">
              <select
                aria-label="Change task status"
                className="absolute inset-0 size-full opacity-0 cursor-pointer z-10"
                onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                value={task.status}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Completed</option>
              </select>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition-colors ${cfg.badge}`}
              >
                {task.status === "in_progress" ? (
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                ) : (
                  <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
                )}
                {cfg.label}
                <span className="text-[9px] opacity-60">▾</span>
              </span>
            </label>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium border opacity-80 ${cfg.badge}`}
              title="Restricted: Only assigned member or Team Lead can move this task"
            >
              <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!canMove && (
            <span
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
              title={`Restricted: Assigned to ${clean(task.assigneeId || "Team Lead")}. You cannot move or edit this task.`}
            >
              <Lock className="size-2.5 text-amber-500 shrink-0" />
              <span className="max-w-[75px] truncate">{clean(task.assigneeId || "Lead")}</span>
            </span>
          )}

          {canDelete && (
            <button
              aria-label="Delete task"
              className="flex size-5.5 items-center justify-center rounded-md text-slate-400 opacity-60 sm:opacity-0 transition-all duration-150 hover:scale-110 hover:bg-rose-50 hover:text-rose-600 sm:group-hover/card:opacity-100 hover:opacity-100 dark:hover:bg-rose-950/40 cursor-pointer"
              disabled={deleting}
              onClick={async (e) => {
                e.stopPropagation();
                setDeleting(true);
                try {
                  await remove(task.id);
                } finally {
                  setDeleting(false);
                }
              }}
              title="Delete task (Team Lead only)"
              type="button"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>

      <h3
        className={`text-xs sm:text-[13px] font-medium text-slate-900 leading-snug break-words dark:text-slate-100 ${
          task.status === "done" ? "line-through text-slate-400 dark:text-slate-500" : ""
        }`}
      >
        {task.title}
      </h3>

      {hasMeta && (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[11px] dark:border-slate-700">
          {task.assigneeId ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <img
                alt={clean(task.assigneeId)}
                className="size-4.5 shrink-0 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                src={getAvatarUrl(task.assigneeId)}
              />
              <span className="truncate font-medium text-slate-600 dark:text-slate-300 max-w-[100px] sm:max-w-[110px]">
                {clean(task.assigneeId)}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {task.dependsOn && task.dependsOn.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                title={`${task.dependsOn.length} dependencies`}
              >
                <Link2 className="size-2.5" />
                <span>{task.dependsOn.length}</span>
              </span>
            )}

            {task.dueDate && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  late
                    ? "border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Calendar className="size-2.5 shrink-0 text-slate-400" />
                <span>{formatDate(task.dueDate)}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
