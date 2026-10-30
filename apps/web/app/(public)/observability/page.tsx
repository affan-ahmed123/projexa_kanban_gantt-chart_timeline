import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft, KanbanSquare } from "lucide-react";
import { ServiceHealthGrid } from "@/features/observability";

export const metadata: Metadata = {
  title: "System Observability & Service Health | Projexa",
  description: "Real-time service health, sequential loopback latency telemetry, and serverless runtime metrics."
};

const ObservabilityPage = (): ReactElement => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1320] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 dark:border-[#1a2940] dark:bg-[#0d1624]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Workspaces</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <KanbanSquare className="size-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Projexa Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/board"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-[#253957] dark:bg-[#152336] dark:text-slate-200 dark:hover:bg-[#1a2c44] transition-colors"
            >
              Open Board
            </Link>
          </div>
        </div>
      </header>

      {/* Main Health Grid Telemetry Dashboard */}
      <main className="py-6 sm:py-8">
        <ServiceHealthGrid />
      </main>
    </div>
  );
};

export default ObservabilityPage;
