"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import type { Workspace } from "../workspace.service";

type WorkspaceDeleteModalProps = Readonly<{
  workspace: Workspace | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}>;

export const WorkspaceDeleteModal = ({
  workspace,
  onClose,
  onConfirmDelete
}: WorkspaceDeleteModalProps): ReactElement | null => {
  if (!workspace) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-3xl border border-rose-200 bg-white p-6 shadow-xl text-slate-900 dark:border-2 dark:border-rose-500/40 dark:bg-gradient-to-b dark:from-[#180e14]/95 dark:via-[#0c1f2b]/95 dark:to-[#061822]/98 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 shadow-sm">
            <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Workspace?</h3>
            <p className="text-xs text-rose-600 dark:text-rose-200/70">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-cyan-100/80 leading-relaxed">
          Are you sure you want to permanently delete workspace{" "}
          <strong className="text-slate-900 dark:text-white">"{workspace.name}"</strong>? All associated
          sprint tasks and member configs will be removed.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-cyan-400/20">
          <button
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer dark:border-cyan-400/40 dark:bg-[#072432]/90 dark:text-cyan-200 dark:hover:bg-[#0c364b]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-98 transition-all cursor-pointer"
            onClick={onConfirmDelete}
            type="button"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
