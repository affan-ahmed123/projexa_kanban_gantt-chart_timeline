"use client";

import { useState, useEffect, type FormEvent, type ReactElement } from "react";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Mail, RefreshCw, Server, X, AlertTriangle } from "lucide-react";
import { SmtpProviderSelector, type SmtpProviderType } from "./smtp-provider-selector";
import { SmtpTestSection } from "./smtp-test-section";

type SmtpSettingsModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
  currentUserEmail?: string;
}>;

type SmtpConfig = {
  isConfigured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
  secure: boolean;
  hasPassword: boolean;
};

export const SmtpSettingsModal = ({
  isOpen,
  onClose,
  onConfigSaved,
  currentUserEmail
}: SmtpSettingsModalProps): ReactElement | null => {
  const [provider, setProvider] = useState<SmtpProviderType>("gmail");
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(587);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");
  const [secure, setSecure] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testRecipient, setTestRecipient] = useState(currentUserEmail || "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [serverConfig, setServerConfig] = useState<SmtpConfig | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage(null);
    fetch("/api/email-config")
      .then((res) => res.json())
      .then((data: SmtpConfig) => {
        setServerConfig(data);
        if (data.host) setHost(data.host);
        if (data.port) setPort(data.port);
        if (data.user) {
          setUser(data.user);
          if (!testRecipient) setTestRecipient(data.user);
        }
        if (data.from) setFrom(data.from);
        if (typeof data.secure === "boolean") setSecure(data.secure);
        if (data.host === "smtp.gmail.com" || (!data.host && data.user.includes("@gmail.com"))) {
          setProvider("gmail");
        } else if (data.host.includes("office365") || data.host.includes("outlook")) {
          setProvider("outlook");
        } else if (data.host) {
          setProvider("custom");
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (p: SmtpProviderType) => {
    setProvider(p);
    setStatusMessage(null);
    if (p === "gmail") {
      setHost("smtp.gmail.com"); setPort(587); setSecure(false);
    } else if (p === "outlook") {
      setHost("smtp.office365.com"); setPort(587); setSecure(false);
    } else {
      setHost(""); setPort(587); setSecure(false);
    }
  };

  const handleTestConnection = async () => {
    const cleanUser = user.trim();
    const cleanPass = pass.replace(/\s+/g, "");
    if (!cleanUser) { setStatusMessage({ type: "error", text: "Please enter your SMTP Username / Email." }); return; }
    if (!cleanPass && !serverConfig?.hasPassword) {
      setStatusMessage({ type: "error", text: "Please enter your SMTP Password / App Password." }); return;
    }
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test", host, port, user: cleanUser,
          pass: cleanPass || undefined,
          from: from || `"${cleanUser.split("@")[0]}" <${cleanUser}>`,
          secure, testRecipient: testRecipient.trim() || cleanUser
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: `🎉 Success! Test email delivered to ${testRecipient.trim() || cleanUser}. Check your inbox!` });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Connection test failed. Please verify credentials." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to connect to email server" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const cleanUser = user.trim();
    const cleanPass = pass.replace(/\s+/g, "");
    if (!cleanUser) { setStatusMessage({ type: "error", text: "Please enter your SMTP Username / Email." }); return; }
    if (!cleanPass && !serverConfig?.hasPassword) {
      setStatusMessage({ type: "error", text: "Please enter your SMTP Password." }); return;
    }
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save", host, port, user: cleanUser, pass: cleanPass,
          from: from || `"${cleanUser.split("@")[0]}" <${cleanUser}>`, secure
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "✅ SMTP settings saved! All invites will now be delivered to inboxes." });
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to save SMTP configuration." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl dark:border-[#20314a] dark:bg-[#121c2d] text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-[#20314a]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 font-bold">
              <Server className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">SMTP Email Delivery Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Send workspace invitations directly into member email inboxes</p>
            </div>
          </div>
          <button aria-label="Close" className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </div>

        <div className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-3 ${serverConfig?.isConfigured ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"}`}>
          <div className="flex items-center gap-2 min-w-0">
            {serverConfig?.isConfigured ? <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="size-4.5 text-amber-600 shrink-0" />}
            <div className="truncate"><span className="font-bold">{serverConfig?.isConfigured ? "SMTP Connected:" : "SMTP Not Configured:"}</span> {serverConfig?.isConfigured ? `Active for ${serverConfig.user || "SMTP Server"}` : "Enter credentials below for automatic inbox delivery"}</div>
          </div>
        </div>

        <SmtpProviderSelector onProviderChange={handleProviderChange} provider={provider} />

        <form className="space-y-3" onSubmit={handleSave}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">SMTP Host</label>
              <input className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white" onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" required type="text" value={host} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Port</label>
              <input className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white" onChange={(e) => setPort(Number(e.target.value))} placeholder="587" required type="number" value={port} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">SMTP Username / Email <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white" onChange={(e) => setUser(e.target.value)} placeholder="your.email@gmail.com" required type="text" value={user} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SMTP Password / App Password <span className="text-rose-500">*</span></label>
              {serverConfig?.hasPassword && !pass && <span className="text-[10px] text-emerald-600 font-medium">✓ Password already set</span>}
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input className="h-9.5 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-9 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[#293d5c] dark:bg-[#172438] dark:text-white" onChange={(e) => setPass(e.target.value)} placeholder={serverConfig?.hasPassword ? "Leave blank to keep existing password" : "Enter password"} type={showPass ? "text" : "password"} value={pass} />
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" onClick={() => setShowPass(!showPass)} type="button">
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <SmtpTestSection disabled={!user} onTest={handleTestConnection} setTestRecipient={setTestRecipient} testRecipient={testRecipient} testing={testing} />

          {statusMessage && (
            <div className={`rounded-xl border p-2.5 text-xs font-medium ${statusMessage.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"}`}>
              {statusMessage.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#20314a]">
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" onClick={onClose} type="button">Close</button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer disabled:opacity-50 transition" disabled={saving || !user} type="submit">
              {saving ? <><RefreshCw className="size-3.5 animate-spin" /><span>Saving…</span></> : <><Check className="size-3.5" /><span>Save SMTP Configuration</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
