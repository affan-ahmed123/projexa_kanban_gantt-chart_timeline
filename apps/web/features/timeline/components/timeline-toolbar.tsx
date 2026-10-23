"use client";

import { Calendar } from "lucide-react";
import type { ReactElement } from "react";
import type { GanttZoom } from "@/features/gantt-chart/public";
import { zoomLevels } from "../timeline.helpers";

type TimelineToolbarProps = Readonly<{
  zoom: GanttZoom;
  onZoomChange: (zoom: GanttZoom) => void;
}>;

export const TimelineToolbar = ({ zoom, onZoomChange }: TimelineToolbarProps): ReactElement => {
  return (
    <section
      aria-label="Timeline controls"
      className="mb-5 sm:mb-6 flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white/95 p-3.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between"
    >
      <div
        aria-label="Timeline zoom"
        className="inline-flex w-fit rounded-xl border border-slate-300 bg-slate-100/90 p-1 dark:border-slate-700 dark:bg-slate-800/80 shadow-2xs"
        role="group"
      >
        {zoomLevels.map((level) => (
          <button
            aria-pressed={zoom === level}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition-all duration-150 cursor-pointer ${
              zoom === level
                ? "bg-white text-slate-900 shadow-xs ring-1 ring-black/5 dark:bg-slate-900 dark:text-white dark:ring-white/10 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50"
            }`}
            key={level}
            onClick={() => onZoomChange(level)}
            type="button"
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <Calendar aria-hidden="true" className="size-4 text-slate-400" />
        Drag tasks between rows to reassign
      </div>
    </section>
  );
};
