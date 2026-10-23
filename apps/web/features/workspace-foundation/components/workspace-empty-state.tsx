"use client";

import { ArrowRight, Crown, Mail, Plus, Rocket, Shield, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

type WorkspaceEmptyStateProps = Readonly<{
  onOpenCreateWorkspace: () => void;
}>;

export const WorkspaceEmptyState = ({
  onOpenCreateWorkspace
}: WorkspaceEmptyStateProps): ReactElement => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto space-y-7 animate-in fade-in zoom-in-95 duration-300 text-slate-900 dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-b dark:from-[#082939]/95 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white">
      <div className="hidden dark:block pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
      </div>

      <div className="relative mx-auto flex size-24 items-center justify-center">
        <div className="absolute inset-0 rounded-3xl border border-cyan-400/30 dark:border-cyan-400/50 animate-sonar-ring pointer-events-none" />
        <div
          className="absolute -inset-2 rounded-3xl border border-cyan-300/20 dark:border-teal-300/40 animate-sonar-ring pointer-events-none"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="relative flex size-20 items-center justify-center rounded-3xl border-2 border-cyan-400/60 bg-gradient-to-tr from-[#072d3f] via-[#0c4a63] to-[#0e6382] text-cyan-200 shadow-sm animate-ambient-float transition-transform duration-300 hover:scale-110"
        >
          <Rocket className="size-9 text-cyan-200 drop-shadow-sm" />
          <span className="absolute -top-1 -right-1 flex size-5.5 items-center justify-center rounded-full border border-amber-300 bg-amber-400 text-slate-900 shadow-xs ring-2 ring-white dark:ring-[#072d3f] animate-pulse">
            <Sparkles className="size-3" />
          </span>
        </div>
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-3.5 py-1 text-xs font-bold text-cyan-800 shadow-2xs mb-3 dark:border-cyan-300/70 dark:bg-cyan-950/80 dark:text-cyan-200">
          <Sparkles className="size-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" style={{ animationDuration: "9s" }} />
          <span>Workspace Hub</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-[#0c4a63] via-[#0891b2] to-[#06b6d4] dark:from-cyan-300 dark:via-teal-200 dark:to-white bg-clip-text text-transparent">
            Projexa
          </span>{" "}
          Workspaces
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-cyan-100/80 leading-relaxed max-w-lg mx-auto">
          Create isolated workspaces for your teams. Each workspace provides independent data, full Team Lead controls, and instant email member invitations.
        </p>
      </div>

      <div className="pt-2 flex flex-col items-center gap-2.5">
        <button
          className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] px-9 py-4 text-sm sm:text-base font-extrabold text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-300 ring-2 ring-cyan-500/20 dark:ring-cyan-400/40 cursor-pointer"
          onClick={onOpenCreateWorkspace}
          type="button"
        >
          <div className="flex size-6.5 items-center justify-center rounded-lg border border-cyan-300/60 bg-cyan-400/20 text-cyan-200 group-hover:bg-cyan-400/30 transition-colors">
            <Plus className="size-4.5 text-cyan-200" />
          </div>
          <span className="tracking-wide">Create Workspace</span>
          <ArrowRight className="size-4.5 text-cyan-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
          <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-cyan-200/80">
          <span className="size-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
          Click to open workspace configuration & setup steps
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 border-t border-slate-200 dark:border-cyan-400/30 text-left">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-cyan-400/30 dark:bg-[#082837]/70">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white mb-1.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-cyan-300 bg-cyan-100 text-cyan-800 shadow-2xs dark:border-cyan-300/70 dark:bg-cyan-950/80 dark:text-cyan-300">
              <Shield className="size-3.5" />
            </div>
            <span>Isolated Data</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-cyan-100/75 leading-normal">
            Independent boards per squad. Members only see their assigned team board.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/40 dark:bg-[#251e08]/60">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-950 dark:text-amber-200 mb-1.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-100 text-amber-800 shadow-2xs dark:border-amber-300/70 dark:bg-amber-950/80 dark:text-amber-300">
              <Crown className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span>Lead Ownership</span>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-100/75 leading-normal">
            Team Lead controls sprints & tasks. Members move only their own tasks.
          </p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-400/40 dark:bg-[#07292a]/60">
          <div className="flex items-center gap-2 font-bold text-xs text-teal-950 dark:text-teal-200 mb-1.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-teal-300 bg-teal-100 text-teal-800 shadow-2xs dark:border-teal-300/70 dark:bg-teal-950/80 dark:text-teal-300">
              <Mail className="size-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <span>Member Invites</span>
          </div>
          <p className="text-[11px] text-teal-800/80 dark:text-teal-100/75 leading-normal">
            Invite by email or copy direct link for instant team onboarding.
          </p>
        </div>
      </div>
    </div>
  );
};
