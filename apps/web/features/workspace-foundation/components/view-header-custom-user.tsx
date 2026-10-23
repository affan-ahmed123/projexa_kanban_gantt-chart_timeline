"use client";

import { LogOut, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactElement } from "react";
import { deleteUserAccount, logoutUser, type UserSession, type Workspace } from "../workspace.service";

type ViewHeaderCustomUserProps = Readonly<{
  currentUser: UserSession | null;
  workspace: Workspace | null;
  onSelectUser: (session: UserSession) => void;
  onCloseDropdown: () => void;
}>;

export const ViewHeaderCustomUser = ({
  currentUser,
  workspace,
  onSelectUser,
  onCloseDropdown
}: ViewHeaderCustomUserProps): ReactElement => {
  const [customEmail, setCustomEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleCustomLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const email = customEmail.trim().toLowerCase();
    const namePart = email.split("@")[0] || "User";
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const isLead =
      workspace?.creatorEmail?.toLowerCase() === email ||
      workspace?.teamLead?.email?.toLowerCase() === email;
    const existingMember = workspace?.members.find((m) => m.email.toLowerCase() === email);

    const session: UserSession = {
      id: `usr-${Date.now()}`,
      name: existingMember?.name || displayName,
      email,
      role: existingMember?.role || (isLead ? "Owner" : "Developer")
    };
    onSelectUser(session);
    onCloseDropdown();
    setShowEmailInput(false);
    setCustomEmail("");
  };

  return (
    <div className="border-t border-slate-200 pt-2 px-1 dark:border-slate-800 space-y-2">
      {showEmailInput ? (
        <form className="space-y-2" onSubmit={handleCustomLogin}>
          <input
            autoFocus
            className="h-8 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="Enter email (e.g. user@example.com)"
            required
            type="email"
            value={customEmail}
          />
          <div className="flex items-center gap-1.5">
            <button
              className="flex-1 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white dark:bg-indigo-600 cursor-pointer"
              type="submit"
            >
              Login
            </button>
            <button
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              onClick={() => setShowEmailInput(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-2 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white cursor-pointer"
          onClick={() => setShowEmailInput(true)}
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Login with Different Email</span>
        </button>
      )}

      {currentUser && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <button
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            onClick={() => {
              logoutUser();
              onCloseDropdown();
              window.location.href = "/";
            }}
            type="button"
          >
            <LogOut className="size-3" />
            <span>Sign Out</span>
          </button>

          <button
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50/80 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer transition-colors"
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to permanently delete your account (${currentUser.email})?`
                )
              ) {
                deleteUserAccount(currentUser.email);
                onCloseDropdown();
                window.location.href = "/";
              }
            }}
            type="button"
          >
            <Trash2 className="size-3" />
            <span>Delete Account</span>
          </button>
        </div>
      )}
    </div>
  );
};
