"use client";

import { useState, useEffect, type FormEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Briefcase, CheckCircle2, Crown, Mail, Rocket, Send, Shield, Target, User, Wrench, X, Zap } from "lucide-react";
import {
  addMemberToWorkspace,
  createInvitationUrl,
  removeMemberFromWorkspace,
  sendInvitationEmail,
  type Workspace,
  type WorkspaceMember
} from "../workspace.service";
import { InviteMembersRoster } from "./invite-members-roster";

type InviteModalProps = Readonly<{
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded?: ((updatedWorkspace: Workspace) => void) | undefined;
  currentUserEmail?: string | undefined;
  currentUserName?: string | undefined;
}>;

const getWorkspaceIcon = (iconId?: string) => {
  switch (iconId) {
    case "zap": return Zap;
    case "briefcase": return Briefcase;
    case "target": return Target;
    case "wrench": return Wrench;
    case "shield": return Shield;
    default: return Rocket;
  }
};

export const InviteModal = ({
  workspace,
  isOpen,
  onClose,
  onMemberAdded,
  currentUserEmail,
  currentUserName
}: InviteModalProps): ReactElement | null => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkspaceMember["role"]>("Developer");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [membersList, setMembersList] = useState<WorkspaceMember[]>(workspace.members || []);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);

  useEffect(() => { setMembersList(workspace.members || []); }, [workspace.members]);

  if (!isOpen || !mounted) return null;

  const leadName = currentUserName || workspace.teamLead?.name || "Team Lead";
  const leadEmail = currentUserEmail || workspace.teamLead?.email || "lead@workspace.com";
  const WsIcon = getWorkspaceIcon(workspace.icon);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Please enter a valid email address."); return; }
    if (membersList.some((m) => m.email.toLowerCase() === cleanEmail)) {
      setError("This member is already in the workspace.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotification(null);
    const fallbackName = cleanEmail.split("@")[0] || "Team Member";
    const displayName = name.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    const newMember: WorkspaceMember = { id: `mem-${Date.now()}`, name: displayName, email: cleanEmail, role, gender };
    const updated = addMemberToWorkspace(workspace.id, newMember);
    if (updated) {
      setMembersList(updated.members);
      if (onMemberAdded) onMemberAdded(updated);
    }
    const inviteUrl = createInvitationUrl(workspace, newMember);
    setLastInviteUrl(inviteUrl);
    setLastInvitedEmail(cleanEmail);
    await sendInvitationEmail({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      inviterName: leadName,
      inviterEmail: leadEmail,
      recipientEmail: cleanEmail,
      recipientName: displayName,
      role,
      inviteUrl
    });
    setLoading(false);
    setEmail("");
    setName("");
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    const updated = removeMemberFromWorkspace(workspace.id, memberId);
    if (updated) {
      setMembersList(updated.members);
      if (onMemberAdded) onMemberAdded(updated);
      setNotification(`Member "${memberName}" removed from workspace.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-lg my-auto max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-900 relative overflow-hidden dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-b dark:from-[#082939]/98 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white" onClick={(e) => e.stopPropagation()}>
        <div className="hidden dark:block pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-10">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
        </div>
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-5 pb-3.5 sm:px-6 dark:border-cyan-400/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-100 text-cyan-900 font-bold shadow-2xs dark:border-cyan-300/60 dark:bg-gradient-to-tr dark:from-[#072d3f] dark:via-[#0c4a63] dark:to-[#0e6382] dark:text-cyan-200">
              <WsIcon className="size-4.5 text-cyan-700 dark:text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white drop-shadow-sm">Team Members & Invitations</h2>
              <p className="text-xs text-slate-500 dark:text-cyan-100/80">Workspace: <strong className="text-cyan-700 dark:text-cyan-300">"{workspace.name}"</strong></p>
            </div>
          </div>
          <button aria-label="Close" className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer dark:text-cyan-200/70 dark:hover:bg-cyan-900/60 dark:hover:text-white" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 sm:px-6 space-y-4 max-h-[calc(92vh-75px)]">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-center gap-2 dark:border-amber-400/40 dark:bg-amber-950/60 dark:text-amber-200">
            <Crown className="size-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate"><span className="font-bold text-amber-950 dark:text-amber-100">Sender (Team Lead):</span> <span>{leadName} ({leadEmail})</span></div>
          </div>
          <form className="space-y-3" onSubmit={handleAddMember}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-cyan-100">Colleague's Email Address <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan-700 dark:text-cyan-300/60" />
                <input autoFocus className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] focus:ring-1 focus:ring-cyan-500 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300" onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required type="email" value={email} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-cyan-100">Full Name (Optional)</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan-700 dark:text-cyan-300/60" />
                  <input className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300" onChange={(e) => setName(e.target.value)} placeholder="e.g. Farhan Ali" type="text" value={name} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-cyan-100">Assign Role</label>
                <select className="h-9.5 w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] cursor-pointer dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:focus:border-cyan-300" onChange={(e) => setRole(e.target.value as WorkspaceMember["role"])} value={role}>
                  <option value="Developer">Developer</option><option value="Designer">Designer</option><option value="Product Manager">Product Manager</option><option value="QA">QA / Tester</option><option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-cyan-100">Avatar & Gender</label>
              <div className="grid grid-cols-2 gap-2">
                <button className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all cursor-pointer ${gender === "male" ? "border-cyan-600 bg-cyan-50 text-cyan-800 ring-2 ring-cyan-500/20 dark:border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:ring-cyan-400/30" : "border-slate-300 bg-slate-50 text-slate-700 hover:border-cyan-400 dark:border-cyan-500/30 dark:bg-[#041822]/60 dark:text-cyan-300/70"}`} onClick={() => setGender("male")} type="button">
                  <img alt="Male Avatar" className="size-6 rounded-full object-cover ring-1 ring-cyan-500 dark:ring-cyan-400" src="/male-avatar.png" /><span>Male</span>
                </button>
                <button className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all cursor-pointer ${gender === "female" ? "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 dark:border-rose-400 dark:bg-rose-950/80 dark:text-rose-200 dark:ring-rose-400/30" : "border-slate-300 bg-slate-50 text-slate-700 hover:border-rose-400 dark:border-cyan-500/30 dark:bg-[#041822]/60 dark:text-cyan-300/70"}`} onClick={() => setGender("female")} type="button">
                  <img alt="Female Avatar" className="size-6 rounded-full object-cover ring-1 ring-rose-500 dark:ring-rose-400" src="/female-avatar.png" /><span>Female</span>
                </button>
              </div>
            </div>
            {error && <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/80 dark:text-rose-200">{error}</div>}
            {notification && <div className="rounded-xl border border-cyan-300 bg-cyan-50 p-2 text-xs font-medium text-cyan-800 dark:border-cyan-400/50 dark:bg-cyan-950/70 dark:text-cyan-200">{notification}</div>}
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:shadow-md active:scale-98 cursor-pointer disabled:opacity-50 transition-all" disabled={loading || !email.trim()} type="submit">
              {loading ? <span>Delivering Invitation to Inbox…</span> : <><Send className="size-4 text-cyan-300" /><span>Send Invitation to Colleague's Inbox</span></>}
            </button>
          </form>
          {lastInviteUrl && lastInvitedEmail && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-950/60 dark:text-white animate-in fade-in duration-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400" /><span>Invitation Sent to {lastInvitedEmail}'s Inbox!</span>
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-100/80 leading-relaxed">
                An invitation email from Team Lead <strong>{leadName}</strong> has been sent to <strong>{lastInvitedEmail}</strong>.
              </p>
            </div>
          )}
          <InviteMembersRoster leadEmail={leadEmail} membersList={membersList} onRemoveMember={handleRemoveMember} />
        </div>
      </div>
    </div>,
    document.body
  );
};
