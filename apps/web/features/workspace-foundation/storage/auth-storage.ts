export type WorkspaceMemberRole = "Owner" | "Admin" | "Developer" | "Designer" | "Product Manager" | "QA";

export type UserSession = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  gender?: "neutral" | "male" | "female" | undefined;
};

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: WorkspaceMemberRole;
  gender?: "neutral" | "male" | "female";
  createdAt: string;
};

export const getRegisteredUsers = (): StoredUser[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("projexa_registered_users");
    const list: StoredUser[] = raw ? JSON.parse(raw) : [];
    // Only users with an actual password (at least 4 characters) are registered accounts!
    return list.filter((u) => typeof u.password === "string" && u.password.trim().length >= 4);
  } catch {
    return [];
  }
};

export const isUserRegistered = (email?: string | null): boolean => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.some((u) => u.email.toLowerCase() === cleanEmail && typeof u.password === "string" && u.password.trim().length >= 4);
};

export const getCurrentUser = (): UserSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("projexa_current_user") || localStorage.getItem("nutsyll_current_user");
    if (raw) {
      const parsed = JSON.parse(raw) as UserSession;
      if (parsed && parsed.email) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: UserSession): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("projexa_current_user", JSON.stringify(user));
    localStorage.removeItem("nutsyll_current_user");
  } catch (e) {
    console.error("Failed to set current user", e);
  }
};

export const logoutUser = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("projexa_current_user");
  localStorage.removeItem("nutsyll_current_user");
  window.dispatchEvent(new Event("projexa_session_change"));
};

export const registerUser = (userData: {
  name: string;
  email: string;
  password?: string;
  role?: WorkspaceMemberRole;
  gender?: "male" | "female";
  autoLogin?: boolean;
}): { success: boolean; user?: StoredUser; error?: string } => {
  if (typeof window === "undefined") return { success: false, error: "Client-side operation" };
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanName = userData.name.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!cleanName) {
    return { success: false, error: "Please enter your full name." };
  }

  const existing = getRegisteredUsers();
  if (existing.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: "An account with this email already exists. Please sign in instead." };
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: userData.password?.trim() || "",
    role: userData.role || "Owner",
    gender: userData.gender || "male",
    createdAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem("projexa_registered_users");
    const list: StoredUser[] = raw ? JSON.parse(raw) : [];
    list.push(newUser);
    localStorage.setItem("projexa_registered_users", JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save registered user", e);
  }

  if (userData.autoLogin !== false) {
    const sessionUser: UserSession = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      gender: newUser.gender
    };
    setCurrentUser(sessionUser);
    window.dispatchEvent(new Event("projexa_session_change"));
  }

  return { success: true, user: newUser };
};

export const authenticateUser = (
  email: string,
  password?: string
): { success: boolean; user?: UserSession; error?: string } => {
  if (typeof window === "undefined") return { success: false, error: "Client-side operation" };
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const users = getRegisteredUsers();
  const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (matched) {
    if (!matched.password || !password || matched.password !== password.trim()) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    const session: UserSession = {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      role: matched.role || "Owner",
      gender: matched.gender
    };
    setCurrentUser(session);
    window.dispatchEvent(new Event("projexa_session_change"));
    return { success: true, user: session };
  }

  return {
    success: false,
    error: "No account found with this email. Please sign up to create your account."
  };
};

export const deleteUserAccount = (email: string): { success: boolean; error?: string } => {
  if (typeof window === "undefined") return { success: false, error: "Client-side operation" };
  try {
    const cleanEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem("projexa_registered_users");
    if (raw) {
      const list: StoredUser[] = JSON.parse(raw);
      const filtered = list.filter((u) => u.email.toLowerCase() !== cleanEmail);
      localStorage.setItem("projexa_registered_users", JSON.stringify(filtered));
    }

    const current = getCurrentUser();
    if (current && current.email.toLowerCase() === cleanEmail) {
      logoutUser();
    }

    const wsRaw = localStorage.getItem("projexa_workspaces") || localStorage.getItem("nutsyll_workspaces");
    if (wsRaw) {
      const workspaces = JSON.parse(wsRaw);
      if (Array.isArray(workspaces)) {
        const updatedWorkspaces = workspaces.map((ws) => ({
          ...ws,
          members: Array.isArray(ws.members)
            ? ws.members.filter((m: { email?: string }) => m.email?.toLowerCase() !== cleanEmail)
            : []
        }));
        localStorage.setItem("projexa_workspaces", JSON.stringify(updatedWorkspaces));
      }
    }

    window.dispatchEvent(new Event("projexa_session_change"));
    window.dispatchEvent(new Event("projexa_workspaces_change"));
    return { success: true };
  } catch (e) {
    console.error("Failed to delete user account", e);
    return { success: false, error: "Failed to delete account" };
  }
};
