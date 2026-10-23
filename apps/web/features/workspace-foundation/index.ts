export { WorkspaceFoundation, ViewHeader, ThemeToggle, InviteModal, AuthCard } from "./components";
export { getAvatarColor, detectGender, getAvatarUrl, getInitials } from "./utils/avatar";
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
  DEFAULT_WORKSPACE,
  DEFAULT_LEAD,
  DEFAULT_STARTER_TASKS
} from "./workspace.model";
export type { Gender } from "./utils/avatar";
export type { Workspace, WorkspaceMember, UserSession, StoredUser, InvitationPayload } from "./workspace.model";
