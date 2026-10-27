"use client";

import { Download, X } from "lucide-react";
import type { ReactElement } from "react";
import type { ChatAttachment } from "../types";

type Props = Readonly<{
  attachment: ChatAttachment | null;
  onClose: () => void;
}>;

export const ChatMediaLightbox = ({ attachment, onClose }: Props): ReactElement | null => {
  if (!attachment) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="w-full flex items-center justify-between text-white/90 mb-3 px-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-sm truncate">{attachment.name}</span>
            <span className="text-xs text-white/60">
              ({(attachment.size / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-medium transition-colors"
              download={attachment.name}
              href={attachment.url}
              rel="noreferrer"
              target="_blank"
              title="Download file"
            >
              <Download className="size-3.5" />
              <span>Download</span>
            </a>

            <button
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white p-1.5 transition-colors cursor-pointer"
              onClick={onClose}
              title="Close preview"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Media Preview */}
        <div className="w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl">
          {attachment.type === "image" && (
            <img
              alt={attachment.name}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
              src={attachment.url}
            />
          )}

          {attachment.type === "video" && (
            <video
              autoPlay
              className="max-h-[80vh] w-auto max-w-full rounded-lg"
              controls
              playsInline
              src={attachment.url}
            />
          )}

          {attachment.type === "file" && (
            <div className="p-8 text-center text-white">
              <p className="text-base font-semibold mb-2">{attachment.name}</p>
              <p className="text-sm text-white/70 mb-4">Click download to save this file to your device.</p>
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 text-sm shadow-md transition-all"
                download={attachment.name}
                href={attachment.url}
              >
                <Download className="size-4" />
                <span>Download Attachment</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
