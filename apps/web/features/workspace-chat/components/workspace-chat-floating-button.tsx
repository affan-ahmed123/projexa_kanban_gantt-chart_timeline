"use client";

import { MessageSquare, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

type Props = Readonly<{
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
  workspaceName?: string;
}>;

export const WorkspaceChatFloatingButton = ({
  onClick,
  isOpen,
  unreadCount = 0,
  workspaceName
}: Props): ReactElement | null => {
  if (isOpen) return null; // hide button when chat window is already open

  return (
    <aside
      aria-label="Workspace Team Chat launcher"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40"
    >
      <button
        aria-label="Open Workspace Team Chat"
        className="relative flex items-center gap-2.5 rounded-full border border-cyan-300/50 bg-gradient-to-r from-[#072d3f] via-[#0c4a63] to-[#0e6382] px-4 py-2.5 text-white shadow-xl shadow-cyan-950/40 hover:shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group backdrop-blur-xl"
        onClick={onClick}
        title={workspaceName ? `Chat with team in #${workspaceName}` : "Open team chat"}
        type="button"
      >
        <div className="relative flex size-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-200 group-hover:text-white">
          <MessageSquare className="size-4 text-cyan-300" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
          </span>
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-white tracking-tight">Team Chat</span>
            <Sparkles className="size-2.5 text-cyan-300 animate-pulse" />
          </div>
          {workspaceName && (
            <span className="text-[10px] text-cyan-200/80 font-medium max-w-[100px] truncate">
              #{workspaceName}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <span className="ml-1 flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full bg-cyan-400 text-[#072d3f] text-[10px] font-black shadow-sm animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </aside>
  );
};
