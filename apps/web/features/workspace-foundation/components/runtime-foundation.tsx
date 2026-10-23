import type { ReactElement } from "react";
import { Database, Globe2, Server, type LucideIcon } from "lucide-react";

type WorkspaceRuntime = Readonly<{
  label: string;
  detail: string;
  icon: LucideIcon;
  badge: string;
}>;

const runtimes: readonly WorkspaceRuntime[] = [
  { label: "Web Application", detail: "Next.js 16 / React 19 Client Suite", icon: Globe2, badge: "Port 3000" },
  { label: "API Microservice", detail: "Express 5 / TypeScript REST Engine", icon: Server, badge: "Port 3001" },
  { label: "Database Layer", detail: "MongoDB / Mongoose Schema Boundary", icon: Database, badge: "Port 27017" }
];

export const RuntimeFoundation = (): ReactElement => (
  <section aria-labelledby="foundation-heading" className="my-6">
    <div className="rounded-2xl border border-slate-300 bg-white/95 p-5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
        <div>
          <h2 id="foundation-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
            Runtime Foundation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active fullstack runtime components and internal workspace service boundaries
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>All Nodes Healthy</span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {runtimes.map(({ label, detail, icon: Icon, badge }) => (
          <div
            className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50/80 p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white hover:shadow-xs dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
            key={label}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs border border-slate-300 dark:bg-slate-700 dark:border-slate-600 text-slate-700 dark:text-slate-200">
              <Icon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{label}</p>
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{badge}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
