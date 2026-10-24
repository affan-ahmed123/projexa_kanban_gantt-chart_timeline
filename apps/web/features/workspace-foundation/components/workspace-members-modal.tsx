"use client";

import { Crown, Mail, Shield, User, UserCheck, Users, X } from "lucide-react";
import type { ReactElement } from "react";
import { getAvatarUrl } from "../utils/profile-avatar";
import type { Workspace, WorkspaceMember } from "../storage/workspace-storage";
import type { UserSession } from "../storage/auth-storage";

type WorkspaceMembersModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  currentUser: UserSession | null;
  onOpenInvite?: () => void;
}>;

const getRoleBadgeStyle = (role: string) => {
  switch (role.toLowerCase()) {
    case "owner":
    case "team lead":
      return "border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "developer":
      return "border-blue-400/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "designer":
      return "border-purple-400/40 bg-purple-500/15 text-purple-700 dark:text-purple-300";
    case "product manager":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "qa engineer":
      return "border-rose-400/40 bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export const WorkspaceMembersModal = ({
  isOpen,
  onClose,
  workspace,
  currentUser,
  onOpenInvite
}: WorkspaceMembersModalProps): ReactElement | null => {
  if (!isOpen || !workspace) return null;

  const isTeamLead = Boolean(
    currentUser &&
    (currentUser.email.toLowerCase() === workspace.creatorEmail?.toLowerCase() ||
      currentUser.email.toLowerCase() === workspace.teamLead?.email?.toLowerCase())
  );

  const membersList: WorkspaceMember[] = workspace.members || [];
  const leadName = workspace.teamLead?.name || "Team Lead";
  const leadEmail = workspace.teamLead?.email || workspace.creatorEmail || "lead@example.com";

  // Check if lead is already in members array, else display lead at top
  const leadAlreadyInMembers = membersList.some(
    (m) => m.email.toLowerCase() === leadEmail.toLowerCase()
  );

  const totalMembersCount = leadAlreadyInMembers ? membersList.length : membersList.length + 1;

  const myRole = isTeamLead
    ? "Team Lead (Owner)"
    : (membersList.find((m) => m.email.toLowerCase() === currentUser?.email.toLowerCase())?.role || "Developer");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-[#20314a] dark:bg-[#121c2d] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-[#20314a] dark:bg-[#172438]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/20 dark:text-cyan-300">
              <Users className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Members</h3>
                <span className="rounded-full bg-cyan-100 dark:bg-cyan-950/80 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 border border-cyan-300/40">
                  {totalMembersCount} {totalMembersCount === 1 ? "member" : "members"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{workspace.name}</p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current user mode banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-transparent border-b border-cyan-500/20 px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              You are joined as: <strong className="text-cyan-700 dark:text-cyan-300">{myRole}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isTeamLead ? "Full Board Control" : "Drag & drop your own tasks"}
          </span>
        </div>

        {/* Member List */}
        <div className="max-h-[380px] overflow-y-auto p-5 space-y-3">
          {/* Team Lead */}
          {!leadAlreadyInMembers && (
            <div className="flex items-center justify-between rounded-xl border border-amber-300/60 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-950/15">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  alt={leadName}
                  className="size-10 rounded-full object-cover ring-2 ring-amber-400/50 shrink-0"
                  src={getAvatarUrl(leadName)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {leadName}
                    </span>
                    <Crown className="size-3 text-amber-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{leadEmail}</span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                Team Lead (Owner)
              </span>
            </div>
          )}

          {/* Members */}
          {membersList.map((member) => {
            const isMe = currentUser?.email.toLowerCase() === member.email.toLowerCase();
            const isMemberLead = member.email.toLowerCase() === leadEmail.toLowerCase();
            return (
              <div
                className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                  isMe
                    ? "border-cyan-400/60 bg-cyan-50/40 dark:border-cyan-500/40 dark:bg-cyan-950/20"
                    : "border-slate-200 bg-white hover:bg-slate-50/80 dark:border-[#23354f] dark:bg-[#162235] dark:hover:bg-[#1c2b42]"
                }`}
                key={member.id}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    alt={member.name}
                    className="size-9 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600 shrink-0"
                    src={getAvatarUrl(member.name)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {member.name}
                      </span>
                      {isMe && (
                        <span className="rounded bg-cyan-100 dark:bg-cyan-900/60 px-1 py-0.2 text-[9px] font-bold text-cyan-800 dark:text-cyan-300">
                          YOU
                        </span>
                      )}
                      {isMemberLead && <Crown className="size-3 text-amber-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shrink-0 ${getRoleBadgeStyle(
                    member.role
                  )}`}
                >
                  {member.role}
                </span>
              </div>
            );
          })}

          {membersList.length === 0 && !leadAlreadyInMembers && (
            <p className="text-center text-xs text-slate-400 py-3">No other team members yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 dark:border-[#20314a] dark:bg-[#172438]">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Shield className="size-3 text-cyan-600 dark:text-cyan-400" />
            <span>Real-time Workspace Member Directory</span>
          </span>
          <div className="flex items-center gap-2">
            {isTeamLead && onOpenInvite && (
              <button
                className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                onClick={() => {
                  onClose();
                  onOpenInvite();
                }}
                type="button"
              >
                + Invite Member
              </button>
            )}
            <button
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
