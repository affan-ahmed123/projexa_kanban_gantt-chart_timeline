"use client";

import { RefreshCw, Send } from "lucide-react";
import type { ReactElement } from "react";

type SmtpTestSectionProps = Readonly<{
  testRecipient: string;
  setTestRecipient: (val: string) => void;
  testing: boolean;
  disabled: boolean;
  onTest: () => void;
}>;

export const SmtpTestSection = ({
  testRecipient,
  setTestRecipient,
  testing,
  disabled,
  onTest
}: SmtpTestSectionProps): ReactElement => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-[#20314a] dark:bg-[#152336] space-y-2">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Test Connection & Inbox Delivery
      </span>
      <div className="flex gap-2">
        <input
          className="h-9 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 dark:border-[#293d5c] dark:bg-[#172438] dark:text-white"
          onChange={(e) => setTestRecipient(e.target.value)}
          placeholder="your.email@gmail.com"
          type="email"
          value={testRecipient}
        />
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 cursor-pointer disabled:opacity-50 transition"
          disabled={disabled || testing}
          onClick={onTest}
          type="button"
        >
          {testing ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Testing…</span>
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              <span>Send Test</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
