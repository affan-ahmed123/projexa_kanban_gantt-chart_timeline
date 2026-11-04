"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, ShieldCheck } from "lucide-react";

type ForgotPasswordFormProps = Readonly<{
  email: string;
  setEmail: (val: string) => void;
  onBackToLogin: () => void;
  onPasswordResetSuccess: (email: string, message: string) => void;
  isRegisteredCheck: (email: string) => boolean;
  onResetPasswordInStorage: (email: string, newPass: string) => { success: boolean; error?: string };
}>;

export const ForgotPasswordForm = ({
  email,
  setEmail,
  onBackToLogin,
  onPasswordResetSuccess,
  isRegisteredCheck,
  onResetPasswordInStorage
}: ForgotPasswordFormProps): ReactElement => {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);
  const [smtpDeliveryNotice, setSmtpDeliveryNotice] = useState<string | null>(null);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isRegisteredCheck(cleanEmail)) {
      setError("No account found with this email. Please check the email or sign up.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanEmail.split("@")[0] || "User",
          purpose: "reset_password"
        })
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to dispatch reset code. Please try again.");
        return;
      }

      const returnedCode = data.verificationCode || data.debugCode;
      if (!data.emailSent) {
        setFallbackCode(returnedCode || null);
        if (returnedCode) {
          setCode(returnedCode);
        }
        setSmtpDeliveryNotice(
          data.deliveryError?.includes("BadCredentials") || data.deliveryError?.includes("535")
            ? "Gmail SMTP credentials rejected (BadCredentials). Your reset code is auto-filled below:"
            : "Email server delivery unavailable. Your reset code is auto-filled below:"
        );
      } else {
        setFallbackCode(null);
        setSmtpDeliveryNotice(null);
        setCode("");
      }

      setStep("reset");
      setResendCooldown(30);
    } catch {
      setSubmitting(false);
      setError("Network error while sending reset code. Please check your connection.");
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: email.trim().split("@")[0] || "User",
          purpose: "reset_password"
        })
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to resend reset code.");
        return;
      }

      const returnedCode = data.verificationCode || data.debugCode;
      if (!data.emailSent) {
        setFallbackCode(returnedCode || null);
        if (returnedCode) setCode(returnedCode);
        setSmtpDeliveryNotice(
          data.deliveryError?.includes("BadCredentials") || data.deliveryError?.includes("535")
            ? "Gmail SMTP credentials rejected (BadCredentials). Your fresh code is auto-filled below:"
            : "Email server delivery unavailable. Your fresh code is auto-filled below:"
        );
      } else {
        setFallbackCode(null);
        setSmtpDeliveryNotice(null);
      }
      setResendCooldown(30);
    } catch {
      setSubmitting(false);
      setError("Network error while resending reset code.");
    }
  };

  const handleVerifyAndReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanPass = newPassword.trim();

    if (!cleanCode || cleanCode.length < 4) {
      setError("Please enter the 6-digit reset code.");
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setError("Please create a password with at least 4 characters.");
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    setSubmitting(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode })
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setSubmitting(false);
        setError(verifyData.error || "Invalid or expired reset code. Please request a new code.");
        return;
      }

      // Update password in storage
      const updateRes = onResetPasswordInStorage(cleanEmail, cleanPass);
      setSubmitting(false);

      if (!updateRes.success) {
        setError(updateRes.error || "Failed to update password. Please try again.");
        return;
      }

      onPasswordResetSuccess(cleanEmail, "🎉 Password updated successfully! Sign in with your new password.");
    } catch {
      setSubmitting(false);
      setError("Network error during password reset. Please try again.");
    }
  };

  if (step === "request") {
    return (
      <form autoComplete="off" className="space-y-4 animate-in fade-in duration-200" onSubmit={handleSendCode}>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-50/70 p-4 text-center dark:border-cyan-400/40 dark:bg-[#072432]/90">
          <div className="mx-auto mb-2.5 flex size-12 items-center justify-center rounded-2xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-400/20 dark:text-cyan-300 ring-4 ring-cyan-500/10">
            <KeyRound className="size-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Forgot Your Password?</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-cyan-200/80">
            Enter your registered email address and we'll send you a 6-digit code to reset your password.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/80 dark:text-rose-200">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
            <input
              autoCapitalize="none"
              autoComplete="off"
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition shadow-xs focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] focus:ring-1 focus:ring-cyan-500 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <button
          className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:border-cyan-500 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          disabled={submitting || !email.trim()}
          type="submit"
        >
          <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
          <span>{submitting ? "Sending Reset Code..." : "Send Password Reset Code"}</span>
          <ArrowRight className="size-4 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="pt-1 text-center">
          <button
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-cyan-300/80 dark:hover:text-white cursor-pointer"
            onClick={onBackToLogin}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <form autoComplete="off" className="space-y-4 animate-in fade-in duration-200" onSubmit={handleVerifyAndReset}>
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-50/70 p-3.5 text-center dark:border-cyan-400/40 dark:bg-[#072432]/90">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-400/20 dark:text-cyan-300 ring-2 ring-cyan-500/10">
          <ShieldCheck className="size-5" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Enter Reset Code</h3>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-cyan-200/80">Code sent to:</p>
        <p className="text-xs font-black text-cyan-700 dark:text-cyan-300 break-all">{email}</p>
      </div>

      {fallbackCode && (
        <div className="rounded-2xl border border-amber-400/70 bg-amber-50/95 p-3 text-xs text-amber-950 dark:border-amber-400/50 dark:bg-amber-950/80 dark:text-amber-100 space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs">
                {smtpDeliveryNotice || "Email delivery failed via SMTP. Use the reset code below:"}
              </p>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/90 dark:bg-[#041520] border border-amber-300 dark:border-amber-500/50 px-3 py-1.5 shadow-2xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-cyan-200/70 block">
                    Your Reset Code:
                  </span>
                  <span className="font-mono text-lg font-black tracking-widest text-amber-700 dark:text-amber-300">
                    {fallbackCode}
                  </span>
                </div>
                <button
                  className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 text-white font-bold text-[10px] px-2.5 py-1 cursor-pointer transition shadow-xs active:scale-95"
                  onClick={() => setCode(fallbackCode)}
                  type="button"
                >
                  Auto-fill Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/80 dark:text-rose-200">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          6-Digit Reset Code
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoComplete="off"
            autoFocus
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-center font-mono text-base font-black tracking-widest text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            required
            type="text"
            value={code}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          New Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoComplete="new-password"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-9 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 4 characters"
            required
            type={showPassword ? "text" : "password"}
            value={newPassword}
          />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-cyan-300/60 dark:hover:text-white cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            type="button"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoComplete="new-password"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            required
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
          />
        </div>
      </div>

      <button
        className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:border-cyan-500 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        disabled={submitting || code.length < 4 || newPassword.length < 4}
        type="submit"
      >
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        <span>{submitting ? "Updating Password..." : "Reset Password & Save"}</span>
        <ArrowRight className="size-4 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <div className="flex items-center justify-between pt-1">
        <button
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-cyan-300/70 dark:hover:text-white cursor-pointer"
          onClick={() => {
            setStep("request");
            setError(null);
            setFallbackCode(null);
          }}
          type="button"
        >
          <ArrowLeft className="size-3.5" />
          <span>Change Email</span>
        </button>

        <button
          className={`inline-flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
            resendCooldown > 0 || submitting
              ? "text-slate-400 dark:text-cyan-400/40 cursor-not-allowed"
              : "text-cyan-600 hover:text-cyan-700 dark:text-cyan-300 dark:hover:text-cyan-200"
          }`}
          disabled={resendCooldown > 0 || submitting}
          onClick={handleResendCode}
          type="button"
        >
          <RefreshCw className={`size-3 ${submitting ? "animate-spin" : ""}`} />
          <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Code"}</span>
        </button>
      </div>
    </form>
  );
};
