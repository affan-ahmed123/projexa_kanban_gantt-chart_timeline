"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import type { FormEvent, ReactElement } from "react";

type SignupFormProps = Readonly<{
  name: string;
  setName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
}>;

export const SignupForm = ({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  submitting,
  onSubmit
}: SignupFormProps): ReactElement => {
  return (
    <form autoComplete="off" className="space-y-4" noValidate onSubmit={onSubmit}>
      <div aria-hidden="true" className="sr-only opacity-0 absolute -z-50 pointer-events-none">
        <input autoComplete="off" name="fake_signup_username_prevent_autofill" tabIndex={-1} type="text" />
        <input autoComplete="new-password" name="fake_signup_password_prevent_autofill" tabIndex={-1} type="password" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          Full Name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition shadow-xs focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] focus:ring-1 focus:ring-cyan-500 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300"
            data-lpignore="true"
            id="projexa_signup_fullname"
            name="projexa_signup_fullname"
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            spellCheck={false}
            type="text"
            value={name}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          Email Address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition shadow-xs focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] focus:ring-1 focus:ring-cyan-500 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300"
            data-1p-ignore="true"
            data-form-type="other"
            data-lpignore="true"
            id="projexa_signup_email_address"
            name="projexa_signup_email_address"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            spellCheck={false}
            type="email"
            value={email}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-cyan-100">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-cyan-300/60" />
          <input
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition shadow-xs focus:border-cyan-600 focus:bg-white dark:focus:bg-[#041822] focus:ring-1 focus:ring-cyan-500 dark:border-cyan-400/40 dark:bg-[#041822]/80 dark:text-white dark:placeholder-cyan-300/40 dark:focus:border-cyan-300"
            data-1p-ignore="true"
            data-form-type="other"
            data-lpignore="true"
            id="projexa_signup_secret_key"
            name="projexa_signup_secret_key"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            type={showPassword ? "text" : "password"}
            value={password}
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

      <button
        className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-600 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0891b2] py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:border-cyan-500 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        disabled={submitting}
        type="submit"
      >
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        <span>{submitting ? "Sending Verification Code..." : "Create Account & Continue"}</span>
        <ArrowRight className="size-4 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </form>
  );
};
