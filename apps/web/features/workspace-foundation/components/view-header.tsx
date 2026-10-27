"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  Activity,
  Briefcase,
  ChevronRight,
  Crown,
  GanttChartSquare,
  KanbanSquare,
  Lock,
  Rocket,
  Shield,
  Target,
  Users,
  Wrench,
  Zap
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import {
  getActiveWorkspace,
  getCurrentUser,
  setCurrentUser,
  type UserSession,
  type Workspace
} from "../workspace.service";
import { ViewHeaderUserMenu } from "./view-header-user-menu";
import { WorkspaceMembersModal } from "./workspace-members-modal";
import { InviteModal } from "./invite-modal";
import {
  WorkspaceChatModal,
  WorkspaceChatTrigger,
  WorkspaceChatFloatingButton,
  useWorkspaceChat
} from "@/features/workspace-chat/public";

type ViewName = "board" | "gantt" | "timeline";

type ViewHeaderProps = Readonly<{
  activeView: ViewName;
  title: string;
  description: string;
  taskCount?: number | undefined;
  apiBaseUrl?: string | undefined;
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

const ViewIcon = ({ view }: Readonly<{ view: ViewName }>): ReactElement => {
  switch (view) {
    case "board": return <KanbanSquare className="size-5 text-cyan-300 dark:text-sky-300" />;
    case "gantt": return <GanttChartSquare className="size-5 text-cyan-300 dark:text-sky-300" />;
    case "timeline": return <Users className="size-5 text-cyan-300 dark:text-sky-300" />;
  }
};

export const ViewHeader = ({
  activeView,
  title,
  description,
  taskCount,
  apiBaseUrl
}: ViewHeaderProps): ReactElement => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentUser, setCurrentUserState] = useState<UserSession | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);

  useEffect(() => {
    setWorkspace(getActiveWorkspace());
    setCurrentUserState(getCurrentUser());
    const handleSessionChange = () => {
      setCurrentUserState(getCurrentUser());
      setWorkspace(getActiveWorkspace());
    };
    window.addEventListener("projexa_session_change", handleSessionChange);
    window.addEventListener("nutsyll_session_change", handleSessionChange);
    return () => {
      window.removeEventListener("projexa_session_change", handleSessionChange);
      window.removeEventListener("nutsyll_session_change", handleSessionChange);
    };
  }, []);

  const { unreadCount } = useWorkspaceChat({
    workspaceId: workspace?.id || "",
    currentUser,
    apiBaseUrl,
    isChatOpen: chatModalOpen
  });

  const handleSelectUser = (session: UserSession) => {
    setCurrentUser(session);
    setCurrentUserState(session);
    window.dispatchEvent(new Event("projexa_session_change"));
    window.dispatchEvent(new Event("nutsyll_session_change"));
  };

  const isCurrentLead = Boolean(
    currentUser &&
    workspace &&
    (currentUser.email.toLowerCase() === workspace.creatorEmail?.toLowerCase() ||
      currentUser.email.toLowerCase() === workspace.teamLead?.email?.toLowerCase())
  );

  const memberInWorkspace = workspace?.members?.find(
    (m) => m.email.toLowerCase() === currentUser?.email.toLowerCase()
  );
  const activeRoleName = isCurrentLead ? "Team Lead" : (memberInWorkspace?.role || "Developer");

  const WsIcon = getWorkspaceIcon(workspace?.icon);

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const membersList = workspace?.members || [];
  const leadEmail = workspace?.teamLead?.email || workspace?.creatorEmail || "";
  const leadAlreadyInMembers = membersList.some((m) => m.email.toLowerCase() === leadEmail.toLowerCase());
  const totalMembersCount = leadAlreadyInMembers ? membersList.length : membersList.length + 1;

  return (
    <header className="relative z-30 mb-4 sm:mb-6 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] p-4 sm:p-5 text-white shadow-sm backdrop-blur-xl">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-t-2xl">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
      </div>

      <div className="relative z-30 mb-3.5 sm:mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            className="inline-flex items-center gap-1.5 font-normal text-cyan-200/90 hover:text-white transition-colors dark:text-slate-400 dark:hover:text-white"
            href="/"
            title="Manage workspace or switch workspace"
          >
            <WsIcon aria-hidden="true" className="size-3.5 text-cyan-300 dark:text-slate-400 shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{workspace?.name || "Workspace"}</span>
          </Link>
          <ChevronRight className="size-3 text-cyan-300/70 dark:text-slate-500 shrink-0" />
          <span className="font-semibold text-white capitalize dark:text-slate-200">{activeView}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
          {/* View Team Members Button */}
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-100 hover:text-white px-2.5 sm:px-3 py-1 text-xs font-medium transition-all shadow-2xs backdrop-blur-xs cursor-pointer active:scale-95"
            onClick={() => setMembersModalOpen(true)}
            title="View workspace members directory and roles"
            type="button"
          >
            <Users className="size-3 text-cyan-300 shrink-0" />
            <span>{totalMembersCount} {totalMembersCount === 1 ? "Member" : "Members"}</span>
          </button>

          {/* Workspace Team Chat Trigger */}
          {workspace && (
            <WorkspaceChatTrigger
              onClick={() => setChatModalOpen(true)}
              unreadCount={unreadCount}
            />
          )}

          <ViewHeaderUserMenu
            activeRoleName={activeRoleName}
            currentUser={currentUser}
            isCurrentLead={isCurrentLead}
            onSelectUser={handleSelectUser}
            workspace={workspace}
          />
          <ThemeToggle />
          {taskCount !== undefined && (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-normal text-slate-700 shadow-2xs backdrop-blur-xs dark:border-[#243a57] dark:bg-[#182638] dark:text-slate-300 dark:shadow-none">
              <Activity className="size-3 text-cyan-600 dark:text-slate-400" />
              <span>{taskCount} {taskCount === 1 ? "task" : "tasks"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/50 bg-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.35)] backdrop-blur-md dark:border-[#2c4568] dark:bg-[#1a2c44] dark:shadow-none">
            <ViewIcon view={activeView} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">{title}</h1>
              {isCurrentLead ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200 border border-amber-300/40">
                  <Crown className="size-2.5" /><span>Lead Mode</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 border border-cyan-300/40">
                  <Lock className="size-2.5" /><span>{activeRoleName} Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-cyan-100/90 mt-0.5 max-w-xl truncate sm:whitespace-normal font-normal dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 rounded-xl border border-cyan-300/40 bg-cyan-950/60 p-1 w-full sm:w-auto shrink-0 shadow-inner backdrop-blur-md dark:border-[#223552] dark:bg-[#0d1624]" role="tablist" aria-label="View switcher">
          <Link
            aria-selected={activeView === "board"}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${activeView === "board" ? "bg-white text-cyan-950 shadow-xs font-semibold border border-white/60 dark:bg-[#1e2f47] dark:text-white dark:border-slate-600" : "text-cyan-200/90 hover:text-white hover:bg-cyan-400/20 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50"}`}
            href="/board"
            role="tab"
          >
            <KanbanSquare aria-hidden="true" className="size-3.5" /><span>Kanban</span>
          </Link>
          <Link
            aria-selected={activeView === "gantt"}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${activeView === "gantt" ? "bg-white text-cyan-950 shadow-xs font-semibold border border-white/60 dark:bg-[#1e2f47] dark:text-white dark:border-slate-600" : "text-cyan-200/80 hover:text-white hover:bg-cyan-400/15 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50"}`}
            href="/gantt"
            role="tab"
          >
            <GanttChartSquare aria-hidden="true" className="size-3.5" /><span>Gantt</span>
          </Link>
          <Link
            aria-selected={activeView === "timeline"}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${activeView === "timeline" ? "bg-white text-cyan-950 shadow-xs font-semibold border border-white/60 dark:bg-[#1e2f47] dark:text-white dark:border-slate-600" : "text-cyan-200/80 hover:text-white hover:bg-cyan-400/15 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50"}`}
            href="/timeline"
            role="tab"
          >
            <Users aria-hidden="true" className="size-3.5" /><span>Timeline</span>
          </Link>
        </div>
      </div>

      <WorkspaceMembersModal
        currentUser={currentUser}
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        onOpenInvite={() => setInviteModalOpen(true)}
        workspace={workspace}
      />

      {inviteModalOpen && workspace && (
        <InviteModal
          currentUserEmail={currentUser?.email || leadEmail}
          currentUserName={currentUser?.name || workspace.teamLead?.name || "Team Lead"}
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          onMemberAdded={(updatedWs) => {
            setWorkspace(updatedWs);
            window.dispatchEvent(new Event("projexa_session_change"));
          }}
          workspace={workspace}
        />
      )}

      {workspace && (
        <>
          <WorkspaceChatModal
            apiBaseUrl={apiBaseUrl}
            currentUser={currentUser}
            isOpen={chatModalOpen}
            onClose={() => setChatModalOpen(false)}
            workspace={workspace}
          />
          <WorkspaceChatFloatingButton
            isOpen={chatModalOpen}
            onClick={() => setChatModalOpen(true)}
            unreadCount={unreadCount}
            workspaceName={workspace.name}
          />
        </>
      )}
    </header>
  );
};
