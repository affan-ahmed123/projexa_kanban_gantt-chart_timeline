"use client";

import { KanbanSquare, LogOut, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import type { UserSession } from "../workspace.service";
import { getAvatarUrl } from "../utils/profile-avatar";
import { ThemeToggle } from "./theme-toggle";

type WorkspaceNavbarProps = Readonly<{
  currentUser: UserSession | null;
  onLogout: () => void;
  onRequestDeleteAccount: () => void;
}>;

export const WorkspaceNavbar = ({
  currentUser,
  onLogout,
  onRequestDeleteAccount
}: WorkspaceNavbarProps): ReactElement => {
  return (
    <nav className="relative z-20 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] px-3.5 py-3 sm:px-5 sm:py-4 text-white shadow-sm backdrop-blur-xl">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
      </div>

      <div className="relative z-10 flex items-center justify-between sm:justify-start gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative flex size-9 sm:size-10.5 shrink-0 items-center justify-center rounded-xl border border-cyan-300/60 bg-cyan-950/60 text-cyan-200 shadow-sm ring-1 ring-cyan-400/40 transition-transform duration-300 hover:scale-105">
            <KanbanSquare className="size-5 sm:size-5.5 text-cyan-300 drop-shadow-sm" />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-cyan-400 ring-2 ring-[#072d3f]" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
                Projexa
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/50 bg-cyan-950/70 px-2 py-0.5 text-[10px] font-bold text-cyan-200 shadow-2xs">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Hub
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-cyan-200/80 truncate">
              Multi-Tenant Team Sprint Boards
            </p>
          </div>
        </div>
        <div className="sm:hidden flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
        {currentUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white/90 px-2.5 sm:px-3 py-1 text-xs font-semibold text-slate-800 shadow-2xs backdrop-blur-md dark:border-cyan-400/40 dark:bg-cyan-950/80 dark:text-cyan-100">
            <img
              alt={currentUser.name}
              className="size-5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-cyan-400/50 shrink-0"
              src={getAvatarUrl(currentUser.name, currentUser.gender)}
            />
            <span className="max-w-[85px] sm:max-w-[140px] truncate">{currentUser.name}</span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hidden sm:inline">
              ({currentUser.role || "Owner"})
            </span>
          </div>
        )}

        {currentUser && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 px-2.5 sm:px-3 py-1 text-xs font-bold text-slate-700 transition-colors cursor-pointer dark:border-cyan-400/40 dark:bg-[#072432]/90 dark:text-cyan-200 dark:hover:bg-[#0d3b51]"
            onClick={onLogout}
            title="Sign out of your account"
            type="button"
          >
            <LogOut className="size-3" />
            <span className="hidden xs:inline sm:inline">Sign Out</span>
          </button>
        )}

        {currentUser && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/80 bg-rose-50/80 hover:bg-rose-100 hover:border-rose-400 text-rose-700 px-2.5 sm:px-3 py-1 text-xs font-bold transition-all cursor-pointer dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
            onClick={onRequestDeleteAccount}
            title="Delete your account permanently"
            type="button"
          >
            <Trash2 className="size-3" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
