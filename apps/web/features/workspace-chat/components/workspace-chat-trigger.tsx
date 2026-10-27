"use client";

import { MessageSquare } from "lucide-react";
import type { ReactElement } from "react";

type WorkspaceChatTriggerProps = Readonly<{
  onClick: () => void;
  unreadCount?: number;
  className?: string;
  showLabel?: boolean;
}>;

export const WorkspaceChatTrigger = ({
  onClick,
  unreadCount = 0,
  className = "",
  showLabel = true
}: WorkspaceChatTriggerProps): ReactElement => {
  return (
    <button
      className={`relative inline-flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-100 hover:text-white px-2.5 sm:px-3 py-1 text-xs font-medium transition-all shadow-2xs backdrop-blur-xs cursor-pointer active:scale-95 group ${className}`}
      onClick={onClick}
      title="Open workspace team chat & media sharing"
      type="button"
    >
      <div className="relative flex items-center justify-center">
        <MessageSquare className="size-3.5 text-cyan-300 group-hover:text-cyan-200 transition-colors shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-80" />
            <span className="relative inline-flex size-2.5 rounded-full bg-cyan-400" />
          </span>
        )}
      </div>

      {showLabel && <span>Team Chat</span>}

      {unreadCount > 0 && (
        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-[#072d3f] text-[10px] font-black shadow-2xs">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};
