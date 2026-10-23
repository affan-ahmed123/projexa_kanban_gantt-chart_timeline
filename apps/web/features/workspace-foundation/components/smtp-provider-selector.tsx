"use client";

import type { ReactElement } from "react";

export type SmtpProviderType = "gmail" | "outlook" | "custom";

type SmtpProviderSelectorProps = Readonly<{
  provider: SmtpProviderType;
  onProviderChange: (p: SmtpProviderType) => void;
}>;

export const SmtpProviderSelector = ({
  provider,
  onProviderChange
}: SmtpProviderSelectorProps): ReactElement => {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        Select Email Provider
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
            provider === "gmail"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-[#20314a] dark:bg-[#152336] dark:text-slate-400"
          }`}
          onClick={() => onProviderChange("gmail")}
          type="button"
        >
          <span>Gmail</span>
        </button>
        <button
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
            provider === "outlook"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-[#20314a] dark:bg-[#152336] dark:text-slate-400"
          }`}
          onClick={() => onProviderChange("outlook")}
          type="button"
        >
          <span>Outlook</span>
        </button>
        <button
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
            provider === "custom"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-[#20314a] dark:bg-[#152336] dark:text-slate-400"
          }`}
          onClick={() => onProviderChange("custom")}
          type="button"
        >
          <span>Custom SMTP</span>
        </button>
      </div>

      {provider === "gmail" && (
        <div className="mt-2.5 rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 text-[11px] text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200 leading-relaxed">
          <span className="font-bold">Google App Password Tip:</span> Use your full Gmail address and a
          16-character Google <strong>App Password</strong> (from Google Account &gt; Security &gt; 2-Step
          Verification &gt; App Passwords), NOT your regular Gmail password.
        </div>
      )}
    </div>
  );
};
