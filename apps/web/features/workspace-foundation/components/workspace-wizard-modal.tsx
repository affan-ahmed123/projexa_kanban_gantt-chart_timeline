"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Crown, Sparkles } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import type { WorkspaceMember } from "../workspace.service";
import { DEPARTMENTS, PRESET_ICONS, getWorkspaceIcon } from "../workspace-foundation.constants";
import { WizardMemberSection } from "./wizard-member-section";

type WorkspaceWizardModalProps = Readonly<{
  name: string;
  setName: (v: string) => void;
  selectedIcon: string;
  setSelectedIcon: (v: string) => void;
  department: string;
  setDepartment: (v: string) => void;
  teamLeadName: string;
  teamLeadEmail: string;
  teamLeadGender: "male" | "female";
  updateTeamLead: (name: string, email: string, gender?: "male" | "female") => void;
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
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreateWorkspace: () => void;
}>;

export const WorkspaceWizardModal = ({
  name,
  setName,
  selectedIcon,
  setSelectedIcon,
  department,
  setDepartment,
  teamLeadName,
  teamLeadEmail,
  teamLeadGender,
  updateTeamLead,
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
  setNewMemberGender,
  submitting,
  error,
  onClose,
  onCreateWorkspace
}: WorkspaceWizardModalProps): ReactElement => {
  const ActiveBadgeIcon = getWorkspaceIcon(selectedIcon);

  return (
    <div id="create-workspace" className="space-y-7 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs backdrop-blur-md transition-all cursor-pointer dark:border-cyan-400/50 dark:bg-[#072432]/90 dark:text-cyan-100 dark:hover:bg-[#0c364b]"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Workspaces</span>
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3.5 py-1 text-xs font-bold text-cyan-800 shadow-2xs dark:border-cyan-300/60 dark:bg-cyan-950/80 dark:text-cyan-200">
          <Sparkles className="size-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          <span>Workspace Setup Wizard</span>
        </div>
      </div>

      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
          Create Your <span className="bg-gradient-to-r from-[#0c4a63] via-[#0891b2] to-[#06b6d4] dark:from-cyan-300 dark:via-teal-200 dark:to-white bg-clip-text text-transparent">Team Workspace</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-cyan-100/80">
          Configure your squad’s isolated environment, ownership profile, and member access.
        </p>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-slate-900 dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-b dark:from-[#082939]/95 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-5 dark:border-cyan-400/30">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-100 text-cyan-900 font-black text-sm shadow-2xs dark:border-cyan-300/60 dark:bg-[#072d3f] dark:text-cyan-200">
            <ActiveBadgeIcon className="size-4.5 text-cyan-800 dark:text-cyan-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Identity</h2>
            <p className="text-xs text-slate-500 dark:text-cyan-100/80">Name and categorize your team sprint hub</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">Workspace Name</label>
            <input
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:bg-white dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:focus:border-cyan-300"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phoenix Mobile App Team"
              type="text"
              value={name}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">Department</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
                onChange={(e) => setDepartment(e.target.value)}
                value={department}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">Badge Icon</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = selectedIcon === item.id;
                  return (
                    <button
                      className={`size-11 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? "border-cyan-600 bg-cyan-600 text-white shadow-xs dark:bg-cyan-500/30 dark:border-cyan-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-400 dark:border-cyan-500/30 dark:bg-[#041822]/60 dark:text-cyan-300/70"
                      }`}
                      key={item.id}
                      onClick={() => setSelectedIcon(item.id)}
                      type="button"
                    >
                      <IconComp className="size-4.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-amber-300 bg-white p-6 sm:p-8 shadow-sm text-slate-900 dark:border-2 dark:border-amber-400/60 dark:bg-gradient-to-br dark:from-[#1c1808]/95 dark:via-[#0c1f2b]/95 dark:to-[#05141e]/95 dark:text-white">
        <div className="flex items-center gap-3 border-b border-amber-200 pb-4 mb-5 dark:border-amber-400/30">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-sm shadow-sm">
            <Crown className="size-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Team Lead Profile (Workspace Creator)</h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200">Owner</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-amber-100/80">Full control over sprints and tasks</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-amber-100">Full Name</label>
              <input
                className="h-11 w-full rounded-xl border border-amber-300/70 bg-slate-50 px-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-500 dark:border-amber-400/40 dark:bg-[#161205]/80 dark:text-white"
                onChange={(e) => updateTeamLead(e.target.value, teamLeadEmail, teamLeadGender)}
                placeholder="e.g. Ibrahim Khan"
                required
                type="text"
                value={teamLeadName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-amber-100">Email Address</label>
              <input
                className="h-11 w-full rounded-xl border border-amber-300/70 bg-slate-50 px-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-500 dark:border-amber-400/40 dark:bg-[#161205]/80 dark:text-white"
                onChange={(e) => updateTeamLead(teamLeadName, e.target.value, teamLeadGender)}
                placeholder="e.g. lead@company.com"
                required
                type="email"
                value={teamLeadEmail}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-amber-100">Avatar</label>
            <div className="grid grid-cols-2 gap-3">
              <button className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-bold transition cursor-pointer ${teamLeadGender === "male" ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/70 dark:text-amber-200" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-amber-500/30 dark:bg-[#120f04]/60 dark:text-amber-200/70"}`} onClick={() => updateTeamLead(teamLeadName, teamLeadEmail, "male")} type="button">
                <img alt="Male" className="size-8 rounded-full object-cover ring-2 ring-amber-400" src="/male-avatar.png" /><span>Male Lead</span>
              </button>
              <button className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs font-bold transition cursor-pointer ${teamLeadGender === "female" ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/70 dark:text-amber-200" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-amber-500/30 dark:bg-[#120f04]/60 dark:text-amber-200/70"}`} onClick={() => updateTeamLead(teamLeadName, teamLeadEmail, "female")} type="button">
                <img alt="Female" className="size-8 rounded-full object-cover ring-2 ring-amber-400" src="/female-avatar.png" /><span>Female Lead</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <WizardMemberSection
        members={members}
        newMemberEmail={newMemberEmail}
        newMemberGender={newMemberGender}
        newMemberName={newMemberName}
        newMemberRole={newMemberRole}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
        setNewMemberEmail={setNewMemberEmail}
        setNewMemberGender={setNewMemberGender}
        setNewMemberName={setNewMemberName}
        setNewMemberRole={setNewMemberRole}
      />

      {error && <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/80 dark:text-rose-200">{error}</div>}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-r dark:from-[#072d3f] dark:via-[#0c4a63] dark:to-[#0e6382] dark:text-white">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to begin sprinting?</h3>
          <p className="text-xs text-slate-500 dark:text-cyan-100/80 mt-0.5">Initializing isolated data with Team Lead and Member permissions</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="w-full sm:w-auto rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer dark:border-cyan-400/50 dark:bg-[#072432]/90 dark:text-cyan-100" onClick={onClose} type="button">Cancel</button>
          <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] px-8 py-3.5 text-xs sm:text-sm font-extrabold text-white cursor-pointer disabled:opacity-50" disabled={submitting} onClick={onCreateWorkspace} type="button">
            {submitting ? <><CheckCircle2 className="size-4 animate-spin text-cyan-300" /><span>Launching…</span></> : <><span>Create Workspace & Launch Board</span><ArrowRight className="size-4 text-cyan-300" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};
