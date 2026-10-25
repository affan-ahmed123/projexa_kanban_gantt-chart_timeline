"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { ArrowRight, FolderGit2, Plus } from "lucide-react";
import Link from "next/link";
import { ApiBoundary } from "./api-boundary";
import { InviteModal } from "./invite-modal";
import { AuthCard } from "./auth-card";
import {
  addMemberToWorkspace,
  createInvitationUrl,
  deleteWorkspace,
  deleteUserAccount,
  getAllWorkspaces,
  getCurrentUser,
  getRegisteredUsers,
  getWorkspacesForUser,
  getWorkspaceTasks,
  leaveWorkspace,
  logoutUser,
  saveActiveWorkspace,
  saveWorkspaceTasks,
  sendInvitationEmail,
  setCurrentUser,
  switchActiveWorkspace,
  type Workspace,
  type WorkspaceMember,
  type UserSession
} from "../workspace.service";
import { WorkspaceNavbar } from "./workspace-navbar";
import { WorkspaceCard } from "./workspace-card";
import { WorkspaceEmptyState } from "./workspace-empty-state";
import { WorkspaceDeleteModal } from "./workspace-delete-modal";
import { WorkspaceLeaveModal } from "./workspace-leave-modal";
import { AccountDeleteModal } from "./account-delete-modal";
import { WorkspaceWizardModal } from "./workspace-wizard-modal";

type WorkspaceFoundationProps = Readonly<{ apiBaseUrl?: string }>;

export const WorkspaceFoundation = ({ apiBaseUrl }: WorkspaceFoundationProps): ReactElement => {

  const [currentUser, setCurrentUserState] = useState<UserSession | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [inviteParams, setInviteParams] = useState<{
    email?: string | undefined;
    name?: string | undefined;
    role?: string | undefined;
    workspaceId?: string | undefined;
    wsName?: string | undefined;
    leadEmail?: string | undefined;
    leadName?: string | undefined;
    dept?: string | undefined;
    icon?: string | undefined;
  }>({});

  const [workspaceToManage, setWorkspaceToManage] = useState<Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [workspaceToLeave, setWorkspaceToLeave] = useState<Workspace | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<UserSession | null>(null);

  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("rocket");
  const [department, setDepartment] = useState("Software Engineering");
  const [teamLeadName, setTeamLeadName] = useState("");
  const [teamLeadEmail, setTeamLeadEmail] = useState("");
  const [teamLeadGender, setTeamLeadGender] = useState<"male" | "female">("male");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceMember["role"]>("Developer");
  const [newMemberGender, setNewMemberGender] = useState<"neutral" | "male" | "female">("male");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = () => {
    const user = getCurrentUser();
    setCurrentUserState(user);
    if (user?.email) {
      setCurrentUserEmail(user.email);
      setUserWorkspaces(getWorkspacesForUser(user.email));
    } else {
      setCurrentUserEmail("");
      setUserWorkspaces([]);
    }
  };

  const handleOpenCreateWorkspace = () => {
    setName("");
    const u = getCurrentUser();
    setTeamLeadName(u?.name || "");
    setTeamLeadEmail(u?.email || "");
    setTeamLeadGender(u?.gender === "female" ? "female" : "male");
    setMembers([]);
    setError(null);
    setIsCreatingWorkspace(true);
  };

  useEffect(() => {
    refreshWorkspaces();
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const wsId = params.get("workspaceId") || undefined;
      const wsName = params.get("wsName") || undefined;
      const leadEmail = params.get("leadEmail") || undefined;
      const leadName = params.get("leadName") || undefined;
      const dept = params.get("dept") || undefined;
      const icon = params.get("icon") || undefined;
      const invEmail = params.get("inviteEmail") || undefined;
      const invName = params.get("inviteName") || undefined;
      const invRole = params.get("role") || undefined;

      if (wsId) {
        const cleanEmail = invEmail ? invEmail.trim().toLowerCase() : "";
        const registered = getRegisteredUsers();
        const existingAccount = cleanEmail ? registered.find((u) => u.email.toLowerCase() === cleanEmail) : undefined;
        const cleanName = existingAccount?.name || (invName ? invName.trim() : (cleanEmail ? cleanEmail.split("@")[0] : "Team Member")) || "Team Member";
        const role = (invRole as WorkspaceMember["role"]) || "Developer";

        const allWorkspaces = getAllWorkspaces();
        let targetWs = allWorkspaces.find((w) => w.id === wsId);

        if (!targetWs && (wsName || leadEmail)) {
          const cleanLeadEmail = (leadEmail || "lead@example.com").trim().toLowerCase();
          const cleanLeadName = (leadName || "Team Lead").trim();
          targetWs = {
            id: wsId,
            name: wsName || "Team Workspace",
            slug: (wsName || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            icon: icon || "rocket",
            department: dept || "Software Engineering",
            creatorEmail: cleanLeadEmail,
            teamLead: { name: cleanLeadName, email: cleanLeadEmail, gender: "male" },
            members: [
              { id: "mem-lead", name: cleanLeadName, email: cleanLeadEmail, role: "Owner", gender: "male" },
              ...(cleanEmail ? [{ id: existingAccount?.id || `mem-${Date.now()}`, name: cleanName, email: cleanEmail, role, gender: existingAccount?.gender || "neutral" }] : [])
            ],
            createdAt: new Date().toISOString()
          };
          saveActiveWorkspace(targetWs);
          if (!getWorkspaceTasks(wsId)) {
            saveWorkspaceTasks(wsId, []);
          }
        } else if (targetWs && cleanEmail) {
          addMemberToWorkspace(wsId, {
            id: existingAccount?.id || `mem-${Date.now()}`,
            name: cleanName,
            email: cleanEmail,
            role,
            gender: existingAccount?.gender || "neutral"
          });
        }

        const pending = {
          email: cleanEmail,
          name: cleanName,
          role,
          workspaceId: wsId,
          wsName: wsName || targetWs?.name,
          leadEmail: leadEmail || targetWs?.creatorEmail,
          leadName: leadName || targetWs?.teamLead?.name,
          dept: dept || targetWs?.department,
          icon: icon || targetWs?.icon
        };
        setInviteParams(pending);
        try {
          sessionStorage.setItem("projexa_pending_invite", JSON.stringify(pending));
        } catch {}

        const activeUser = getCurrentUser();
        if (activeUser && cleanEmail && activeUser.email.toLowerCase() === cleanEmail) {
          switchActiveWorkspace(wsId);
          window.history.replaceState({}, document.title, window.location.pathname);
          refreshWorkspaces();
        } else if (activeUser && cleanEmail && activeUser.email.toLowerCase() !== cleanEmail) {
          // If a different user (e.g. Team Lead) is currently logged in,
          // log them out so the invited team member can sign in/register with their own account.
          logoutUser();
          setCurrentUserState(null);
          setCurrentUserEmail("");
          setUserWorkspaces([]);
          setInviteParams(pending);
        } else if (!activeUser) {
          // Member will sign in or register through AuthCard
          setInviteParams(pending);
        } else {
          refreshWorkspaces();
        }
      } else if (invEmail) {
        setInviteParams({ email: invEmail, name: invName, role: invRole, workspaceId: wsId });
      }
      if (window.location.hash.includes("create") || search.includes("create=true")) handleOpenCreateWorkspace();
    }
    const handleSessionChange = () => refreshWorkspaces();
    window.addEventListener("projexa_session_change", handleSessionChange);
    return () => window.removeEventListener("projexa_session_change", handleSessionChange);
  }, []);

  const updateTeamLead = (leadName: string, leadEmail: string, leadGender: "male" | "female" = teamLeadGender) => {
    setTeamLeadName(leadName);
    setTeamLeadEmail(leadEmail);
    setTeamLeadGender(leadGender);
    setMembers((prev) => {
      const remaining = prev.filter((m) => m.id !== "mem-lead");
      if (!leadName.trim() && !leadEmail.trim()) return remaining;
      return [{ id: "mem-lead", name: leadName.trim() || "Team Lead", email: leadEmail.trim(), role: "Owner", gender: leadGender }, ...remaining];
    });
  };

  const handleAddMember = (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    if (!trimmedEmail) { setError("Please enter a valid member email address."); return; }
    if (members.some((m) => m.email.toLowerCase() === trimmedEmail)) {
      setError("A member with this email address already exists."); return;
    }
    const fallbackName = trimmedEmail.split("@")[0] || "Team Member";
    const displayName = newMemberName.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    setMembers((prev) => [...prev, { id: `mem-${Date.now()}`, name: displayName, email: trimmedEmail, role: newMemberRole, gender: newMemberGender }]);
    setNewMemberEmail("");
    setNewMemberName("");
    setError(null);
  };

  const handleCreateWorkspace = async () => {
    if (!name.trim()) { setError("Please enter a workspace name."); return; }
    const cleanLeadEmail = teamLeadEmail.trim().toLowerCase();
    const cleanLeadName = teamLeadName.trim() || "Team Lead";
    if (!cleanLeadEmail || !cleanLeadEmail.includes("@")) { setError("Please enter a valid email for the Team Lead."); return; }
    setSubmitting(true);
    setError(null);
    const wsId = `ws-${Date.now()}`;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let finalMembers = [...members];
    if (!finalMembers.some((m) => m.id === "mem-lead" || m.email.toLowerCase() === cleanLeadEmail)) {
      finalMembers = [{ id: "mem-lead", name: cleanLeadName, email: cleanLeadEmail, role: "Owner", gender: teamLeadGender }, ...finalMembers];
    }
    const newWorkspace: Workspace = {
      id: wsId, name: name.trim(), slug, icon: selectedIcon, department,
      creatorEmail: cleanLeadEmail, teamLead: { name: cleanLeadName, email: cleanLeadEmail, gender: teamLeadGender },
      members: finalMembers, createdAt: new Date().toISOString()
    };
    saveActiveWorkspace(newWorkspace);
    saveWorkspaceTasks(wsId, []);
    const invited = finalMembers.filter((m) => m.id !== "mem-lead" && m.email.toLowerCase() !== cleanLeadEmail);
    if (invited.length > 0) {
      void Promise.all(invited.map((m) => sendInvitationEmail({
        workspaceId: wsId, workspaceName: newWorkspace.name, inviterName: cleanLeadName,
        inviterEmail: cleanLeadEmail, recipientEmail: m.email, recipientName: m.name,
        role: m.role, inviteUrl: createInvitationUrl(newWorkspace, m)
      })));
    }
    setCurrentUser({ id: "usr-lead", name: cleanLeadName, email: cleanLeadEmail, role: "Owner" });
    setTimeout(() => { if (typeof window !== "undefined") window.location.href = "/board"; }, 350);
  };

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">
      <span className="sr-only">The application foundation is running.</span>
      <div className="sr-only"><Link href="/board">Board</Link><Link href="/gantt">Gantt</Link></div>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
        <div className="absolute inset-0 bg-white dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-[#03131c] via-[#062331] to-[#020d14]" />
      </div>
      <WorkspaceNavbar currentUser={currentUser} onLogout={() => { logoutUser(); setCurrentUserState(null); setCurrentUserEmail(""); setUserWorkspaces([]); }} onRequestDeleteAccount={() => currentUser && setAccountToDelete(currentUser)} />
      {!currentUser ? (
        <div className="py-6 sm:py-10 max-w-4xl mx-auto">
          <AuthCard
            inviteEmail={inviteParams.email}
            inviteName={inviteParams.name}
            inviteRole={inviteParams.role}
            onSuccess={(u) => {
              let pending = inviteParams;
              if (!pending.workspaceId && typeof window !== "undefined") {
                try {
                  const stored = sessionStorage.getItem("projexa_pending_invite");
                  if (stored) pending = JSON.parse(stored);
                } catch {}
              }

              if (pending.workspaceId) {
                const all = getAllWorkspaces();
                let ws = all.find((w) => w.id === pending.workspaceId);
                const role = (pending.role as WorkspaceMember["role"]) || "Developer";

                if (!ws && (pending.wsName || pending.leadEmail)) {
                  const cleanLeadEmail = (pending.leadEmail || "lead@example.com").trim().toLowerCase();
                  const cleanLeadName = (pending.leadName || "Team Lead").trim();
                  ws = {
                    id: pending.workspaceId,
                    name: pending.wsName || "Team Workspace",
                    slug: (pending.wsName || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    icon: pending.icon || "rocket",
                    department: pending.dept || "Software Engineering",
                    creatorEmail: cleanLeadEmail,
                    teamLead: { name: cleanLeadName, email: cleanLeadEmail, gender: "male" },
                    members: [
                      { id: "mem-lead", name: cleanLeadName, email: cleanLeadEmail, role: "Owner", gender: "male" },
                      { id: u.id, name: u.name, email: u.email.toLowerCase(), role, gender: u.gender || "neutral" }
                    ],
                    createdAt: new Date().toISOString()
                  };
                  saveActiveWorkspace(ws);
                  if (!getWorkspaceTasks(pending.workspaceId)) {
                    saveWorkspaceTasks(pending.workspaceId, []);
                  }
                } else if (ws) {
                  addMemberToWorkspace(pending.workspaceId, {
                    id: u.id,
                    name: u.name,
                    email: u.email.toLowerCase(),
                    role,
                    gender: u.gender || "neutral"
                  });
                }

                switchActiveWorkspace(pending.workspaceId);
                try {
                  sessionStorage.removeItem("projexa_pending_invite");
                } catch {}
              }

              setCurrentUserState(u);
              setCurrentUserEmail(u.email);
              setUserWorkspaces(getWorkspacesForUser(u.email));
              setInviteParams({});
              if (typeof window !== "undefined") {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
          />
        </div>
      ) : !isCreatingWorkspace ? (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
          {userWorkspaces.length > 0 ? (
            <>
              <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm text-slate-900 dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-r dark:from-[#072d3f] dark:via-[#0c4a63] dark:to-[#0e6382] dark:text-white">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800 mb-2.5 shadow-2xs dark:border-cyan-300/70 dark:bg-cyan-950/80 dark:text-cyan-200">
                    <FolderGit2 className="size-3.5" /><span>Your Active Workspaces</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Team Workspaces ({userWorkspaces.length})</h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-cyan-100/80 mt-1">Each workspace provides isolated task databases, Team Lead controls, and live members.</p>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white cursor-pointer" onClick={handleOpenCreateWorkspace} type="button">
                  <Plus className="size-4 text-cyan-100" /><span>Create Workspace</span><ArrowRight className="size-3.5 text-cyan-200" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userWorkspaces.map((ws) => {
                  const isLead = Boolean(
                    currentUser && (
                      currentUser.email.toLowerCase() === ws.creatorEmail?.toLowerCase() ||
                      currentUser.email.toLowerCase() === ws.teamLead?.email?.toLowerCase()
                    )
                  );
                  const memberRecord = ws.members?.find(
                    (m) => m.email.toLowerCase() === currentUser?.email.toLowerCase()
                  );
                  return (
                    <WorkspaceCard
                      isTeamLead={isLead}
                      key={ws.id}
                      memberRole={memberRecord?.role || "Developer"}
                      onAddMembers={(w) => setWorkspaceToManage(w)}
                      onOpenBoard={(id) => {
                        switchActiveWorkspace(id);
                        if (typeof window !== "undefined") window.location.href = "/board";
                      }}
                      onRequestDelete={(w) => setWorkspaceToDelete(w)}
                      onRequestLeave={(w) => setWorkspaceToLeave(w)}
                      workspace={ws}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <WorkspaceEmptyState onOpenCreateWorkspace={handleOpenCreateWorkspace} />
          )}
        </div>
      ) : (
        <WorkspaceWizardModal department={department} error={error} members={members} name={name} newMemberEmail={newMemberEmail} newMemberGender={newMemberGender} newMemberName={newMemberName} newMemberRole={newMemberRole} onAddMember={handleAddMember} onClose={() => setIsCreatingWorkspace(false)} onCreateWorkspace={handleCreateWorkspace} onRemoveMember={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))} selectedIcon={selectedIcon} setDepartment={setDepartment} setName={setName} setNewMemberEmail={setNewMemberEmail} setNewMemberGender={setNewMemberGender} setNewMemberName={setNewMemberName} setNewMemberRole={setNewMemberRole} setSelectedIcon={setSelectedIcon} submitting={submitting} teamLeadEmail={teamLeadEmail} teamLeadGender={teamLeadGender} teamLeadName={teamLeadName} updateTeamLead={updateTeamLead} />
      )}
      {workspaceToManage && <InviteModal currentUserEmail={currentUserEmail} currentUserName={teamLeadName} isOpen={true} onClose={() => setWorkspaceToManage(null)} onMemberAdded={(up) => { refreshWorkspaces(); setWorkspaceToManage(up); }} workspace={workspaceToManage} />}
      <WorkspaceDeleteModal onClose={() => setWorkspaceToDelete(null)} onConfirmDelete={() => { if (workspaceToDelete) { deleteWorkspace(workspaceToDelete.id); setWorkspaceToDelete(null); refreshWorkspaces(); } }} workspace={workspaceToDelete} />
      <WorkspaceLeaveModal onClose={() => setWorkspaceToLeave(null)} onConfirmLeave={() => { if (workspaceToLeave && currentUser) { leaveWorkspace(workspaceToLeave.id, currentUser.email); setWorkspaceToLeave(null); refreshWorkspaces(); } }} workspace={workspaceToLeave} />
      <AccountDeleteModal account={accountToDelete} onClose={() => setAccountToDelete(null)} onConfirmDelete={(email) => { deleteUserAccount(email); setAccountToDelete(null); setCurrentUserState(null); setCurrentUserEmail(""); setUserWorkspaces([]); }} />
      {apiBaseUrl && <ApiBoundary baseUrl={apiBaseUrl} />}
    </main>
  );
};
