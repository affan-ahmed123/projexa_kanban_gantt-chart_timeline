"use client";

import { ArrowLeft, ArrowRight, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import type { FormEvent, ReactElement } from "react";

type VerifyCodeFormProps = Readonly<{
  email: string;
  verificationCode: string;
  setVerificationCode: (val: string) => void;
  submitting: boolean;
  resendCooldown: number;
  onSubmit: (e: FormEvent) => void;
  onBackToSignup: () => void;
  onResendCode: () => void;
}>;

export const VerifyCodeForm = ({
  email,
  verificationCode,
  setVerificationCode,
  submitting,
  resendCooldown,
  onSubmit,
  onBackToSignup,
  onResendCode
}: VerifyCodeFormProps): ReactElement => {
  return (
    <form autoComplete="off" className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200" noValidate onSubmit={onSubmit}>
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-50/70 p-4 text-center dark:border-cyan-400/40 dark:bg-[#072432]/90">
        <div className="mx-auto mb-2.5 flex size-12 items-center justify-center rounded-2xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-400/20 dark:text-cyan-300 ring-4 ring-cyan-500/10">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Verification Code Sent</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-cyan-200/80">We sent a 6-digit code to:</p>
        <p className="mt-0.5 text-xs font-black text-cyan-700 dark:text-cyan-300 break-all">{email}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100 text-center">
          Enter 6-Digit Code
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoComplete="off"
            autoFocus
            className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-center font-mono text-xl sm:text-2xl font-black tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-500 dark:border-cyan-400/50 dark:bg-[#041822]/90 dark:text-cyan-200 dark:placeholder-cyan-300/40 dark:focus:border-cyan-300"
            data-1p-ignore="true"
            data-lpignore="true"
            id="projexa_verify_code_input"
            maxLength={6}
            name="projexa_verify_code_input"
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            required
            type="text"
            value={verificationCode}
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-cyan-300/70">
          Check your Gmail inbox and Spam folder (valid for 10 minutes)
        </p>
      </div>

      <button
        className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:border-cyan-500 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        disabled={submitting || verificationCode.length < 4}
        type="submit"
      >
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        <span>{submitting ? "Verifying Code..." : "Verify & Complete Registration"}</span>
        <ArrowRight className="size-4 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <div className="flex items-center justify-between pt-1">
        <button
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-cyan-300/70 dark:hover:text-white cursor-pointer"
          onClick={onBackToSignup}
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
          onClick={onResendCode}
          type="button"
        >
          <RefreshCw className={`size-3 ${submitting ? "animate-spin" : ""}`} />
          <span>{resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}</span>
        </button>
      </div>
    </form>
  );
};
