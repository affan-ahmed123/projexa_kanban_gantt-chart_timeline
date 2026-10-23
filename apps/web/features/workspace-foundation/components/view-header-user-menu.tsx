"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Check, ChevronDown, Crown, User } from "lucide-react";
import type { UserSession, Workspace } from "../workspace.service";
import { getAvatarUrl } from "../utils/profile-avatar";
import { ViewHeaderCustomUser } from "./view-header-custom-user";

type ViewHeaderUserMenuProps = Readonly<{
  currentUser: UserSession | null;
  workspace: Workspace | null;
  isCurrentLead: boolean;
  onSelectUser: (session: UserSession) => void;
}>;

export const ViewHeaderUserMenu = ({
  currentUser,
  workspace,
  isCurrentLead,
  onSelectUser
}: ViewHeaderUserMenuProps): ReactElement => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-40" ref={dropdownRef}>
      <button
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs transition-all cursor-pointer backdrop-blur-xs ${
          isCurrentLead
            ? "border-amber-300 bg-amber-950/70 text-amber-200 hover:bg-amber-900/80 dark:border-amber-500/60 dark:bg-amber-950/80"
            : "border-cyan-300/60 bg-cyan-950/70 text-cyan-100 hover:bg-cyan-900/80 dark:border-slate-700 dark:bg-slate-800"
        }`}
        onClick={() => setUserDropdownOpen(!userDropdownOpen)}
        title="Click to switch active user role and test permissions"
        type="button"
      >
        {isCurrentLead ? (
          <Crown className="size-3 text-amber-400 shrink-0" />
        ) : (
          <User className="size-3 text-cyan-300 shrink-0" />
        )}
        <span className="max-w-[120px] sm:max-w-[160px] truncate">
          {currentUser?.name || "Select User"}
        </span>
        <span className="text-[10px] opacity-75 font-normal">
          ({isCurrentLead ? "Team Lead" : currentUser?.role || "Member"})
        </span>
        <ChevronDown className="size-3 opacity-70 shrink-0" />
      </button>

      {userDropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-300 bg-white p-2.5 text-slate-900 shadow-2xl backdrop-blur-lg dark:border-[#2b3e5e] dark:bg-[#121c2d] dark:text-white z-50 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-slate-200 pb-2 px-2 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Switch Active User
              </span>
              <span className="text-[10px] text-slate-400">Simulate Permissions</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Lead has full control; Members can only move their own tasks.
            </p>
          </div>

          <div className="my-1.5 space-y-1 max-h-56 overflow-y-auto">
            {workspace && (
              <button
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                  currentUser?.email.toLowerCase() === workspace.teamLead?.email.toLowerCase()
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-semibold border border-amber-300/80"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => {
                  onSelectUser({
                    id: "usr-lead",
                    name: workspace.teamLead?.name || "Team Lead",
                    email: workspace.teamLead?.email || workspace.creatorEmail,
                    role: "Owner"
                  });
                  setUserDropdownOpen(false);
                }}
                type="button"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    alt={workspace.teamLead?.name || "Lead"}
                    className="size-6 shrink-0 rounded-full object-cover ring-1 ring-amber-400"
                    src={getAvatarUrl(workspace.teamLead?.name || "Lead", workspace.teamLead?.gender)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{workspace.teamLead?.name || "Team Lead"}</span>
                      <Crown className="size-3 text-amber-500 shrink-0" />
                    </div>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {workspace.teamLead?.email || workspace.creatorEmail} (Full Control)
                    </span>
                  </div>
                </div>
                {currentUser?.email.toLowerCase() === workspace.teamLead?.email.toLowerCase() && (
                  <Check className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
              </button>
            )}

            {workspace?.members
              .filter(
                (m) =>
                  m.id !== "mem-lead" &&
                  m.email.toLowerCase() !== workspace.teamLead?.email.toLowerCase()
              )
              .map((m) => {
                const isSelected = currentUser?.email.toLowerCase() === m.email.toLowerCase();
                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200 font-semibold border border-cyan-300/80"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    key={m.id}
                    onClick={() => {
                      onSelectUser({ id: m.id, name: m.name, email: m.email, role: m.role });
                      setUserDropdownOpen(false);
                    }}
                    type="button"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        alt={m.name}
                        className="size-6 shrink-0 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                        src={getAvatarUrl(m.name, m.gender)}
                      />
                      <div className="min-w-0">
                        <span className="truncate block">{m.name}</span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {m.email} ({m.role})
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>

          <ViewHeaderCustomUser
            currentUser={currentUser}
            onCloseDropdown={() => setUserDropdownOpen(false)}
            onSelectUser={onSelectUser}
            workspace={workspace}
          />
        </div>
      )}
    </div>
  );
};
