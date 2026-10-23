// Server-side verification code store for Projexa signup verification

type VerificationRecord = {
  code: string;
  email: string;
  name: string;
  expiresAt: number;
};

// Use globalThis to survive Next.js Fast Refresh / HMR during development
const globalStore = globalThis as unknown as {
  __projexa_verifications?: Map<string, VerificationRecord>;
};

if (!globalStore.__projexa_verifications) {
  globalStore.__projexa_verifications = new Map<string, VerificationRecord>();
}

export const verificationStore = globalStore.__projexa_verifications;

export const saveVerificationCode = (
  email: string,
  code: string,
  name: string,
  ttlMinutes = 10
): void => {
  const cleanEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  verificationStore.set(cleanEmail, {
    code: code.trim(),
    email: cleanEmail,
    name: name.trim(),
    expiresAt
  });
};

export const verifyCode = (
  email: string,
  code: string
): { valid: boolean; reason?: string } => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const record = verificationStore.get(cleanEmail);
  if (!record) {
    return { valid: false, reason: "No verification code found. Please request a new code." };
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(cleanEmail);
    return { valid: false, reason: "Verification code has expired. Please request a new code." };
  }

  if (record.code !== cleanCode) {
    return { valid: false, reason: "Invalid verification code. Please check your email and try again." };
  }

  // Code verified successfully, clear it
  verificationStore.delete(cleanEmail);
  return { valid: true };
};
