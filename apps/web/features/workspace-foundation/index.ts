export { WorkspaceFoundation, ViewHeader, ThemeToggle, InviteModal, AuthCard } from "./components";
export { getAvatarColor, detectGender, getAvatarUrl, getInitials } from "./utils/profile-avatar";
export {
  getActiveWorkspace,
  saveActiveWorkspace,
  getAllWorkspaces,
  getWorkspacesForUser,
  switchActiveWorkspace,
  deleteWorkspace,
  addMemberToWorkspace,
  removeMemberFromWorkspace,
  createInvitationUrl,
  sendInvitationEmail,
  getCurrentUser,
  setCurrentUser,
  registerUser,
  authenticateUser,
  logoutUser,
  deleteUserAccount,
  getRegisteredUsers,
  getWorkspaceTasks,
  saveWorkspaceTasks,
  normalizeTaskDates,
  DEFAULT_WORKSPACE,
  DEFAULT_LEAD,
  DEFAULT_STARTER_TASKS
} from "./workspace.service";
export type { Gender } from "./utils/profile-avatar";
export type { Workspace, WorkspaceMember, UserSession, StoredUser, InvitationPayload } from "./workspace.service";
