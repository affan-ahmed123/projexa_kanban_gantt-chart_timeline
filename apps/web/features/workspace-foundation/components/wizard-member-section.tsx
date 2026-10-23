"use client";

import { Trash2, Users } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import type { WorkspaceMember } from "../workspace.service";
import { getAvatarUrl } from "../utils/profile-avatar";

type WizardMemberSectionProps = Readonly<{
  members: WorkspaceMember[];
  onAddMember: (e: FormEvent) => void;
  onRemoveMember: (id: string) => void;
  newMemberEmail: string;
  setNewMemberEmail: (v: string) => void;
  newMemberName: string;
  setNewMemberName: (v: string) => void;
  newMemberRole: WorkspaceMember["role"];
  setNewMemberRole: (v: WorkspaceMember["role"]) => void;
  newMemberGender: "neutral" | "male" | "female";
  setNewMemberGender: (v: "neutral" | "male" | "female") => void;
}>;

export const WizardMemberSection = ({
  members,
  onAddMember,
  onRemoveMember,
  newMemberEmail,
  setNewMemberEmail,
  newMemberName,
  setNewMemberName,
  newMemberRole,
  setNewMemberRole,
  newMemberGender,
  setNewMemberGender
}: WizardMemberSectionProps): ReactElement => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-slate-900 dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-b dark:from-[#082939]/95 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 dark:border-cyan-400/30">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Users className="size-4 text-cyan-600 dark:text-cyan-400" />
          <span>Invite Team Members</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-cyan-100/80">{members.length} Members</span>
      </div>

      <form
        className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-cyan-400/30 dark:bg-[#072432]/70"
        onSubmit={onAddMember}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-cyan-600 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            type="email"
            value={newMemberEmail}
          />
          <input
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-cyan-600 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Full Name"
            type="text"
            value={newMemberName}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            onChange={(e) => setNewMemberRole(e.target.value as WorkspaceMember["role"])}
            value={newMemberRole}
          >
            <option value="Developer">Developer</option>
            <option value="Designer">Designer</option>
            <option value="Product Manager">Product Manager</option>
            <option value="QA">QA / Tester</option>
            <option value="Admin">Admin</option>
          </select>
          <button
            className="h-10 px-4 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] text-xs font-bold text-white cursor-pointer disabled:opacity-50"
            disabled={!newMemberEmail.trim()}
            type="submit"
          >
            + Add
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {members.map((m) => (
          <div
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-cyan-400/30 dark:bg-[#072432]/80"
            key={m.id}
          >
            <div className="flex items-center gap-2 min-w-0">
              <img alt={m.name} className="size-7 rounded-full object-cover" src={getAvatarUrl(m.name, m.gender)} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{m.name}</span>
                <span className="text-[10px] text-slate-400 block truncate">{m.email}</span>
              </div>
            </div>
            {m.role !== "Owner" && (
              <button
                aria-label={`Remove ${m.name}`}
                className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                onClick={() => onRemoveMember(m.id)}
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
