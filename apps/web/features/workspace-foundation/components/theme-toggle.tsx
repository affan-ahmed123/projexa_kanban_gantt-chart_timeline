"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = (): ReactElement => {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const stored = localStorage.getItem("theme");
    const activeDark = stored ? stored === "dark" : hasDarkClass;
    setIsDark(activeDark);
    if (activeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) {
    return (
      <button
        aria-label="Toggle Day / Night mode"
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/50 bg-cyan-950/60 px-3 py-1 text-xs font-normal text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.2)] backdrop-blur-xs transition-all duration-200 cursor-pointer dark:bg-[#182638] dark:border-[#2d4364] dark:text-slate-200 dark:shadow-none"
        type="button"
      >
        <Moon className="size-3 text-cyan-200 dark:text-amber-400" />
        <span>Night</span>
      </button>
    );
  }

  return (
    <button
      aria-label={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/50 bg-cyan-950/60 px-3 py-1 text-xs font-medium text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.2)] backdrop-blur-xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer dark:bg-[#182638] dark:border-[#2d4364] dark:text-slate-200 dark:shadow-[0_0_12px_rgba(30,58,95,0.4)]"
      onClick={toggle}
      title={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      type="button"
    >
      {isDark ? (
        <>
          <Sun className="size-3 text-amber-400" />
          <span className="font-semibold text-amber-300">Day</span>
        </>
      ) : (
        <>
          <Moon className="size-3 text-cyan-200" />
          <span className="font-semibold text-cyan-100">Night</span>
        </>
      )}
    </button>
  );
};
