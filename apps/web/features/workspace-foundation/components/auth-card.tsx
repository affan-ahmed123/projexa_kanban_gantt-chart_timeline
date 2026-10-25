"use client";

import { useState, useEffect, type FormEvent, type ReactElement } from "react";
import { CheckCircle2, LogIn, Sparkles, UserPlus } from "lucide-react";
import {
  authenticateUser,
  getRegisteredUsers,
  registerUser,
  type UserSession,
  type WorkspaceMember
} from "../workspace.service";
import { detectGender } from "../utils/profile-avatar";
import { LoginForm } from "./auth/login-form";
import { SignupForm } from "./auth/signup-form";
import { VerifyCodeForm } from "./auth/verify-code-form";

type AuthMode = "login" | "signup";
type SignupStep = "form" | "verify";

type AuthCardProps = Readonly<{
  initialMode?: AuthMode;
  onSuccess?: (user: UserSession) => void;
  inviteEmail?: string | undefined;
  inviteName?: string | undefined;
  inviteRole?: string | undefined;
}>;

export const AuthCard = ({
  initialMode = "login",
  onSuccess,
  inviteEmail,
  inviteName,
  inviteRole
}: AuthCardProps): ReactElement => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [email, setEmail] = useState(inviteEmail || "");
  const [name, setName] = useState(inviteName || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(
    inviteEmail
      ? `You have been invited as ${inviteRole || "a Team Member"}! Sign in with your registered account or create one.`
      : null
  );

  useEffect(() => {
    if (inviteEmail) {
      const cleanInv = inviteEmail.trim().toLowerCase();
      setEmail(cleanInv);
      if (inviteName) setName(inviteName);
      const isRegistered = getRegisteredUsers().some((u) => u.email.toLowerCase() === cleanInv);
      if (isRegistered) {
        setMode("login");
        setInfoBanner(
          `Welcome! Please sign in with your password to access the workspace as ${inviteRole || "a Team Member"}.`
        );
      } else {
        setMode("signup");
        setInfoBanner(
          `You've been invited as ${inviteRole || "a Team Member"}! Create your password below to access the workspace.`
        );
      }
    }
  }, [inviteEmail, inviteName, inviteRole]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoBanner(null);
    setSubmitting(true);
    const res = authenticateUser(email, password);
    setSubmitting(false);
    if (!res.success || !res.user) {
      setError(res.error || "Failed to sign in. Please verify your email and password.");
      return;
    }
    if (onSuccess) onSuccess(res.user);
  };

  const handleInitiateSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoBanner(null);
    setSuccessBanner(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) { setError("Please enter a valid email address."); return; }
    if (!cleanName) { setError("Please enter your full name."); return; }
    if (!password || password.length < 4) { setError("Please create a password with at least 4 characters."); return; }
    if (getRegisteredUsers().some((u) => u.email.toLowerCase() === cleanEmail)) {
      setError("An account with this email already exists. Please sign in instead.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: cleanName })
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to dispatch verification email. Please try again.");
        return;
      }
      setSignupStep("verify");
      setVerificationCode("");
      setResendCooldown(30);
      setInfoBanner(`A 6-digit verification code has been sent to ${cleanEmail}. Check your inbox or spam folder.`);
    } catch {
      setSubmitting(false);
      setError("Network error while sending verification code. Please check your connection.");
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setInfoBanner(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() || "User" })
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok || !data.success) { setError(data.error || "Failed to resend code."); return; }
      setResendCooldown(30);
      setInfoBanner(`A fresh verification code was sent to ${email.trim().toLowerCase()}.`);
    } catch {
      setSubmitting(false);
      setError("Network error while resending verification code.");
    }
  };

  const handleVerifyAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoBanner(null);
    const cleanCode = verificationCode.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanCode || cleanCode.length < 4) { setError("Please enter the 6-digit verification code."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode })
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired verification code. Please check your email or request a new code.");
        return;
      }
      const detected = detectGender(name);
      const assignedRole: WorkspaceMember["role"] = (inviteRole as WorkspaceMember["role"]) || "Developer";
      const regRes = registerUser({
        name,
        email: cleanEmail,
        password,
        role: assignedRole,
        gender: detected === "female" ? "female" : "male",
        autoLogin: true
      });
      if (!regRes.success || !regRes.user) {
        setError(regRes.error || "Failed to save registration.");
        return;
      }

      if (onSuccess) {
        onSuccess({
          id: regRes.user.id,
          name: regRes.user.name,
          email: regRes.user.email,
          role: regRes.user.role,
          gender: regRes.user.gender
        });
        return;
      }

      setSignupStep("form");
      setVerificationCode("");
      setEmail("");
      setName("");
      setPassword("");
      setMode("login");
      setSuccessBanner("🎉 Successfully registered! Please log in with your email and password.");
    } catch {
      setSubmitting(false);
      setError("Network error during code verification. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="relative overflow-hidden rounded-3xl border border-slate-300/90 bg-white p-6 sm:p-8 shadow-[0_14px_40px_-6px_rgba(15,23,42,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] text-slate-900 transition-all dark:border-2 dark:border-cyan-400/50 dark:bg-gradient-to-b dark:from-[#082939]/98 dark:via-[#061e2b]/98 dark:to-[#041520]/98 dark:text-white dark:shadow-none">
        <div className="hidden dark:block pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-3.5 py-1 text-xs font-bold text-cyan-800 shadow-2xs mb-3 dark:border-cyan-300/70 dark:bg-cyan-950/80 dark:text-cyan-200">
            <Sparkles className="size-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" style={{ animationDuration: '9s' }} />
            <span>Projexa Authentication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            {mode === "login" ? "Sign In to" : signupStep === "verify" ? "Verify Email for" : "Create Account on"}{" "}
            <span className="bg-gradient-to-r from-[#0c4a63] via-[#0891b2] to-[#06b6d4] dark:from-cyan-300 dark:via-teal-200 dark:to-white bg-clip-text text-transparent">Projexa</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-cyan-100/75">
            {mode === "login" ? "Access your isolated workspaces, boards, and sprints" : signupStep === "verify" ? "Enter the 6-digit verification code sent to your email" : "Set up your profile and join squad workspaces"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 mb-6 dark:border-cyan-400/30 dark:bg-[#072432]/80">
          <button className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${mode === "login" ? "bg-white text-slate-900 shadow-xs dark:bg-cyan-600 dark:text-white font-black" : "text-slate-600 hover:text-slate-900 dark:text-cyan-200/80 dark:hover:text-white"}`} onClick={() => { setMode("login"); setSignupStep("form"); setEmail(""); setName(""); setPassword(""); setError(null); setInfoBanner(null); }} type="button">
            <LogIn className="size-3.5" /><span>Sign In</span>
          </button>
          <button className={`inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${mode === "signup" ? "bg-white text-slate-900 shadow-xs dark:bg-cyan-600 dark:text-white font-black" : "text-slate-600 hover:text-slate-900 dark:text-cyan-200/80 dark:hover:text-white"}`} onClick={() => { setMode("signup"); setSignupStep("form"); setEmail(""); setName(""); setPassword(""); setError(null); setInfoBanner(null); setSuccessBanner(null); }} type="button">
            <UserPlus className="size-3.5" /><span>Create Account</span>
          </button>
        </div>
        {successBanner && mode === "login" && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-50/95 p-3.5 text-xs text-emerald-950 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-950/80 dark:text-emerald-100 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="min-w-0"><p className="font-extrabold text-emerald-900 dark:text-emerald-200">{successBanner}</p><p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300/90">Enter your credentials below to proceed into your workspace.</p></div>
          </div>
        )}
        {infoBanner && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-cyan-400/40 bg-cyan-50/90 p-3 text-xs font-semibold text-cyan-900 shadow-2xs dark:border-cyan-400/40 dark:bg-cyan-950/70 dark:text-cyan-200 animate-in fade-in">
            <Sparkles className="size-3.5 shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" /><span>{infoBanner}</span>
          </div>
        )}
        {error && <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 shadow-2xs dark:border-rose-500/50 dark:bg-rose-950/80 dark:text-rose-200 animate-in fade-in">{error}</div>}
        {mode === "login" ? (
          <LoginForm email={email} onClearSuccessBanner={() => setSuccessBanner(null)} onSubmit={handleLogin} password={password} setEmail={setEmail} setPassword={setPassword} setShowPassword={setShowPassword} showPassword={showPassword} submitting={submitting} />
        ) : signupStep === "verify" ? (
          <VerifyCodeForm email={email} onBackToSignup={() => { setSignupStep("form"); setError(null); setInfoBanner(null); }} onResendCode={handleResendCode} onSubmit={handleVerifyAndRegister} resendCooldown={resendCooldown} setVerificationCode={setVerificationCode} submitting={submitting} verificationCode={verificationCode} />
        ) : (
          <SignupForm email={email} name={name} onSubmit={handleInitiateSignup} password={password} setEmail={setEmail} setName={setName} setPassword={setPassword} setShowPassword={setShowPassword} showPassword={showPassword} submitting={submitting} />
        )}
      </div>
    </div>
  );
};
