import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ServiceHealthGrid } from "@/features/observability";

export const metadata: Metadata = {
  title: "System Observability & Service Health | Projexa",
  description: "Real-time service health, sequential loopback latency telemetry, and serverless runtime metrics.",
  robots: {
    index: false,
    follow: false
  }
};

const ObservabilityPage = (): ReactElement => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1320] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 dark:border-[#1a2940] dark:bg-[#0d1624]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
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
