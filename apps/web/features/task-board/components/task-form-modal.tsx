"use client";

import type { TaskStatus } from "@workspace/types";
import { X } from "lucide-react";
import { useState, type FormEvent, type ReactElement } from "react";
import type { WorkspaceMember } from "@/features/workspace-foundation/public";

type TaskFormModalProps = Readonly<{
  status: TaskStatus;
  add: (s: TaskStatus, t: string, a: string | null, st: string | null, d: string | null) => Promise<boolean>;
  close: () => void;
  members?: readonly WorkspaceMember[];
  leadName?: string;
}>;

export const TaskFormModal = ({
  status: initialStatus,
  add,
  close,
  members = [],
  leadName
}: TaskFormModalProps): ReactElement => {
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [gender, setGender] = useState("neutral");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const name = assignee.trim();
    const user = name ? (gender === "neutral" ? name : `${name}::${gender}`) : null;
    const effectiveStart = start.trim() ? start.trim() : null;
    const effectiveDue = due.trim() ? due.trim() : null;
    try {
      if (await add(status, title.trim(), user, effectiveStart, effectiveDue)) close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="w-full max-w-md space-y-3.5 rounded-2xl border border-slate-300 bg-white p-5 shadow-xl dark:border-[#20314a] dark:bg-[#121c2d] animate-in fade-in zoom-in-95 duration-150"
      onSubmit={submit}
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#20314a]">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Create Task</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add a new task to your sprint board</p>
        </div>
        <button
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          onClick={close}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Title</label>
        <input
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a2b3f] focus:ring-1 focus:ring-cyan-400 dark:border-[#293d5c] dark:bg-[#172438] dark:text-white dark:placeholder:text-slate-400"
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
          value={title}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Status</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a2b3f] dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer"
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            value={status}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Completed</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Assignee</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a2b3f] dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer"
            onChange={(e) => {
              const val = e.target.value;
              setAssignee(val);
              const m = members.find((x) => x.name === val);
              if (m && m.gender) setGender(m.gender);
            }}
            value={assignee}
          >
            <option value="">Unassigned</option>
            {leadName && <option value={leadName}>{leadName} (Team Lead)</option>}
            {members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Start Date</label>
            {start && (
              <button
                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                onClick={() => setStart("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a2b3f] dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            onChange={(e) => setStart(e.target.value)}
            type="date"
            value={start}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Due Date</label>
            {due && (
              <button
                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                onClick={() => setDue("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white dark:focus:bg-[#1a2b3f] dark:border-[#293d5c] dark:bg-[#172438] dark:text-white cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            onChange={(e) => setDue(e.target.value)}
            type="date"
            value={due}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#20314a]">
        <button
          className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          onClick={close}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer disabled:opacity-50"
          disabled={saving || !title.trim()}
          type="submit"
        >
          {saving ? "Creating…" : "Create Task"}
        </button>
      </div>
    </form>
  );
};
