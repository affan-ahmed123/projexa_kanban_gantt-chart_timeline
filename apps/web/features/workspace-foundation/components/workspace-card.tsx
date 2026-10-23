"use client";

import { ArrowRight, Crown, Lock, LogOut, Mail, Trash2, UserPlus } from "lucide-react";
import type { ReactElement } from "react";
import type { Workspace } from "../workspace.service";
import { getAvatarUrl } from "../utils/profile-avatar";
import { getWorkspaceIcon } from "../workspace-foundation.constants";

type WorkspaceCardProps = Readonly<{
  workspace: Workspace;
  isTeamLead?: boolean;
  onOpenBoard: (workspaceId: string) => void;
  onAddMembers: (workspace: Workspace) => void;
  onRequestDelete: (workspace: Workspace) => void;
  onRequestLeave?: (workspace: Workspace) => void;
}>;

export const WorkspaceCard = ({
  workspace: ws,
  isTeamLead = false,
  onOpenBoard,
  onAddMembers,
  onRequestDelete,
  onRequestLeave
}: WorkspaceCardProps): ReactElement => {
  const WsCardIcon = getWorkspaceIcon(ws.icon);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:border-cyan-400 hover:shadow-md hover:-translate-y-0.5 text-slate-900 transition-all duration-300 dark:border-2 dark:border-cyan-400/40 dark:bg-gradient-to-b dark:from-[#082939]/95 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white dark:hover:border-cyan-300">
      <div className="hidden dark:block pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
      </div>

      <div>
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10.5 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/50 bg-gradient-to-tr from-[#072d3f] via-[#0c4a63] to-[#0e6382] text-cyan-200 font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
              <WsCardIcon className="size-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{ws.name}</h2>
                {!isTeamLead && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100/90 dark:bg-cyan-950/90 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-700/60 shrink-0">
                    <Lock className="size-2.5" /> Member
                  </span>
                )}
              </div>
              <span className="inline-block text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 truncate">
                {ws.department}
              </span>
            </div>
          </div>

          {isTeamLead ? (
            <button
              aria-label="Delete workspace"
              className="flex size-7.5 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(ws);
              }}
              title="Delete this workspace"
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : (
            onRequestLeave && (
              <button
                aria-label="Leave workspace"
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-400 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestLeave(ws);
                }}
                title="Leave this workspace"
                type="button"
              >
                <LogOut className="size-3" />
                <span>Leave</span>
              </button>
            )
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100 mb-1">
            <img
              alt={ws.teamLead?.name || "Lead"}
              className="size-5.5 rounded-full object-cover ring-1 ring-amber-400 shrink-0"
              src={getAvatarUrl(ws.teamLead?.name || "Lead", ws.teamLead?.gender || "male")}
            />
            <div className="flex items-center gap-1 min-w-0">
              <span className="truncate">Lead: {ws.teamLead?.name || ws.creatorEmail}</span>
              <Crown className="size-3 text-amber-500 dark:text-amber-400 shrink-0" />
            </div>
          </div>
          <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 flex items-center gap-1 pl-7.5">
            <Mail className="size-2.5 shrink-0" />
            <span className="truncate">{ws.teamLead?.email || ws.creatorEmail}</span>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs">
          <div className="flex -space-x-2 overflow-hidden">
            {ws.members.slice(0, 5).map((m) => (
              <img
                alt={m.name}
                className="size-7 rounded-full object-cover ring-2 ring-white dark:ring-[#082939]"
                key={m.id}
                src={getAvatarUrl(m.name, m.gender)}
                title={`${m.name} (${m.role}) - ${m.email}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            {ws.members.length} {ws.members.length === 1 ? "Member" : "Members"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 pt-3.5 border-t border-slate-100 dark:border-cyan-400/30">
        <button
          className={`${
            isTeamLead ? "flex-1" : "w-full"
          } inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] py-2.5 text-xs font-extrabold text-white shadow-sm hover:border-cyan-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer`}
          onClick={() => onOpenBoard(ws.id)}
          type="button"
        >
          <span>Open Board</span>
          <ArrowRight className="size-3.5 text-cyan-300" />
        </button>

        {isTeamLead && (
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0 dark:border-cyan-400/50 dark:bg-cyan-950/70 dark:hover:bg-cyan-900/80 dark:text-cyan-200"
            onClick={(e) => {
              e.stopPropagation();
              onAddMembers(ws);
            }}
            title="Invite more team members to this workspace"
            type="button"
          >
            <UserPlus className="size-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>+ Add Members</span>
          </button>
        )}
      </div>
    </div>
  );
};
