import type { Task } from "@workspace/types";
import { CalendarDays } from "lucide-react";
import type { ReactElement } from "react";

type GanttUnscheduledListProps = Readonly<{
  tasks: readonly Task[];
}>;

export const GanttUnscheduledList = ({ tasks }: GanttUnscheduledListProps): ReactElement => {
  return (
    <section aria-labelledby="unscheduled-heading" className="mt-8">
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white" id="unscheduled-heading">
            Unscheduled Tasks
          </h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200/80 shadow-2xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Tasks requiring start or due dates</p>
      </header>
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            All tasks have start and due dates assigned.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <li
              className="rounded-xl border border-slate-200/80 bg-white/85 p-3.5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/85"
              key={task.id}
            >
              <p className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                {task.title}
              </p>
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {!task.startDate && !task.dueDate
                  ? "Both dates missing"
                  : !task.startDate
                    ? "Start date missing"
                    : "Due date missing"}
              </p>
              {task.dependsOn.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">{task.dependsOn.length} dependencies linked</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
