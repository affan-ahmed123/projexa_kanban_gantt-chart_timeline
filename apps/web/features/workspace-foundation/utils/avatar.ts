export type AvatarPalette = Readonly<{
  bg: string;
  text: string;
  border: string;
}>;

export type Gender = "male" | "female" | "neutral";

const PALETTE: readonly AvatarPalette[] = Object.freeze([
  { bg: "#eff6ff", text: "#0284c7", border: "#bfdbfe" }, // sky
  { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" }, // emerald
  { bg: "#fffbeb", text: "#d97706", border: "#fde68a" }, // amber
  { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" }, // violet
  { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" }, // indigo
  { bg: "#fef2f2", text: "#e11d48", border: "#fecdd3" }, // rose
  { bg: "#f0fdf4", text: "#0d9488", border: "#99f6e4" }, // teal
  { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" }, // cyan
]);

// Common male and female names for detection
const MALE_NAMES = new Set([
  "ali", "zain", "hassan", "ahmed", "affan", "usman", "bilal", "hamza", "abdullah", 
  "john", "michael", "david", "james", "robert", "william", "richard", "thomas",
  "charles", "daniel", "matthew", "joseph", "christopher", "mark", "donald", "paul",
  "steven", "andrew", "kenneth", "joshua", "kevin", "brian", "george", "edward",
  "omar", "fahad", "khalid", "saeed", "tariq", "imran", "faisal", "adnan", "farhan",
  "ibrahim", "ahsan", "danyal", "ayan", "hamid", "anas", "ayaan", "shahid", "noman",
  "rehan", "adeel", "atif", "waqas", "shoaib", "haris", "arslan", "kashif", "zubair"
]);

const FEMALE_NAMES = new Set([
  "aisha", "fatima", "zainab", "maryam", "sara", "hira", "amna", "sana", "noor",
  "mary", "patricia", "jennifer", "linda", "barbara", "elizabeth", "susan", "jessica",
  "sarah", "karen", "nancy", "lisa", "betty", "margaret", "sandra", "ashley",
  "dorothy", "kimberly", "emily", "donna", "michelle", "carol", "amanda", "melissa",
  "ayesha", "hina", "khadija", "mahnoor", "anum", "sidra", "rabia", "nimra", "mariam",
  "bushra", "iqra", "laiba", "mehak", "kinza", "zoya", "arooj", "shiza", "rida", "aleena"
]);

export const getAvatarColor = (name: string): AvatarPalette => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index] ?? PALETTE[0]!;
};

export const detectGender = (name: string): Gender => {
  if (name.endsWith("::male")) return "male";
  if (name.endsWith("::female")) return "female";

  const normalized = name.toLowerCase().trim().split(/\s+/)[0] ?? "";
  
  if (MALE_NAMES.has(normalized)) return "male";
  if (FEMALE_NAMES.has(normalized)) return "female";
  
  // Fallback: check common name endings
  if (normalized.endsWith("a") || normalized.endsWith("ah") || normalized.endsWith("een")) {
    return "female";
  }
  
  return "neutral";
};

export const getAvatarUrl = (name: string, explicitGender?: Gender): string => {
  if (explicitGender === "male") {
    return "/male-avatar.png";
  }
  if (explicitGender === "female") {
    return "/female-avatar.png";
  }

  const gender = detectGender(name);
  if (gender === "male") {
    return "/male-avatar.png";
  }
  if (gender === "female") {
    return "/female-avatar.png";
  }

  // Consistent deterministic fallback so an avatar image is always guaranteed to load cleanly
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0 ? "/male-avatar.png" : "/female-avatar.png";
};

export const getInitials = (name: string): string => {
  const cleanName = name.replace(/::(male|female)$/, "");
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
};
