"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { KeyRound, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";

type AdminKeyPromptProps = Readonly<{
  onSubmitKey: (key: string) => void | Promise<void>;
  isLoading?: boolean | undefined;
  errorMessage?: string | null | undefined;
}>;

export const AdminKeyPrompt = ({
  onSubmitKey,
  isLoading = false,
  errorMessage
}: AdminKeyPromptProps): ReactElement => {
  const [keyInput, setKeyInput] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) return;
    // Security: The key is directly passed to caller and never logged to console or stored in DOM as text
    await onSubmitKey(cleanKey);
    setKeyInput("");
  };

  return (
    <div className="flex min-h-[420px] w-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-[#20314a]">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-bold shrink-0">
            <KeyRound className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Administrator Key Required
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Observability & system telemetry access
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Real-time service health, serverless instance metrics, and loopback latency probes require server administrator authentication. Please enter your configured <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono text-blue-600 dark:bg-slate-800 dark:text-blue-400">OBSERVABILITY_ADMIN_KEY</code>.
        </p>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
            <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="observability-admin-key"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Admin Authorization Key <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="observability-admin-key"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter server OBSERVABILITY_ADMIN_KEY"
                required
                autoComplete="off"
                disabled={isLoading}
                className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !keyInput.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>Unlock Telemetry Dashboard</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Keys are stored strictly in session memory and never sent in query parameters.
          </span>
        </div>
      </div>
    </div>
  );
};
