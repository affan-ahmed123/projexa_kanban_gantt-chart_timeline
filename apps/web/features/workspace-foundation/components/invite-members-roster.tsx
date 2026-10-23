"use client";

import { Crown, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import type { WorkspaceMember } from "../workspace.model";
import { getAvatarUrl } from "../utils/avatar";

type InviteMembersRosterProps = Readonly<{
  membersList: readonly WorkspaceMember[];
  leadEmail: string;
  onRemoveMember: (memberId: string, memberName: string) => void;
}>;

export const InviteMembersRoster = ({
  membersList,
  leadEmail,
  onRemoveMember
}: InviteMembersRosterProps): ReactElement => {
  return (
    <div className="border-t border-slate-200 dark:border-cyan-400/20 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
          Current Members ({membersList.length})
        </span>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
        {membersList.map((m) => {
          const isLead = m.id === "mem-lead" || m.email.toLowerCase() === leadEmail.toLowerCase();
          return (
            <div
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-cyan-400/30 dark:bg-[#072432]/70 dark:text-white"
              key={m.id}
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  alt={m.name}
                  className={`size-7 shrink-0 rounded-full object-cover ring-2 ${
                    isLead ? "ring-amber-400" : "ring-cyan-500/50 dark:ring-cyan-400/50"
                  }`}
                  src={getAvatarUrl(m.name, m.gender)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold block text-slate-900 dark:text-white">
                      {m.name}
                    </span>
                    {isLead && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[8px] font-bold text-amber-900 border border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-400/40">
                        <Crown className="size-2 text-amber-500 dark:text-amber-400" />
                        <span>Lead</span>
                      </span>
                    )}
                  </div>
                  <span className="truncate text-[10px] text-slate-500 dark:text-cyan-200/60 block">
                    {m.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded bg-white border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:bg-cyan-950/80 dark:border-cyan-400/30 dark:text-cyan-200">
                  {m.role}
                </span>

                {!isLead && (
                  <button
                    aria-label={`Remove ${m.name}`}
                    className="flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition cursor-pointer"
                    onClick={() => onRemoveMember(m.id, m.name)}
                    title={`Remove ${m.name} from workspace`}
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
