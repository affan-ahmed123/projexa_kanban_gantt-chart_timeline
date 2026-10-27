"use client";

import {
  Crown,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Users,
  Video,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement
} from "react";
import { createPortal } from "react-dom";
import type { ChatAttachment, ChatMessage } from "../types";
import { useWorkspaceChat } from "../hooks/use-workspace-chat";
import { ChatMediaLightbox } from "./chat-media-lightbox";
import {
  getAvatarUrl,
  type UserSession,
  type Workspace
} from "@/features/workspace-foundation/public";

type WorkspaceChatModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  currentUser: UserSession | null;
  apiBaseUrl?: string | undefined;
}>;

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) {
    return timeStr;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeStr}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const WorkspaceChatModal = ({
  isOpen,
  onClose,
  workspace,
  currentUser,
  apiBaseUrl
}: WorkspaceChatModalProps): ReactElement | null => {
  const workspaceId = workspace?.id || "";
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<ChatAttachment | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    sendTyping,
    markAsRead
  } = useWorkspaceChat({
    workspaceId,
    currentUser,
    apiBaseUrl,
    isChatOpen: isOpen
  });

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      markAsRead();
      scrollToBottom(false);
    }
  }, [isOpen, messages.length, markAsRead, scrollToBottom]);

  // Handle file selection preview
  useEffect(() => {
    if (!selectedFile) {
      setFilePreviewUrl(null);
      return;
    }

    if (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    setFilePreviewUrl(null);
    return;
  }, [selectedFile]);

  if (!isOpen || !workspace || !mounted) return null;

  const handleSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 25MB max size limit for smooth browser performance
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25MB limit. Please select a smaller file.");
        return;
      }
      setSelectedFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedFile) || isSending) return;
    setIsSending(true);

    const success = await sendMessage({
      content: inputText,
      file: selectedFile
    });

    if (success) {
      setInputText("");
      setSelectedFile(null);
      setFilePreviewUrl(null);
      scrollToBottom(true);
      textareaRef.current?.focus();
    }
    setIsSending(false);
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(query) ||
      m.senderName.toLowerCase().includes(query) ||
      (m.attachment && m.attachment.name.toLowerCase().includes(query))
    );
  });

  const membersCount = (workspace.members?.length || 0) + 1;
  const leadEmail = workspace.teamLead?.email || workspace.creatorEmail || "";

  return createPortal(
    <>
      <div
        className={`fixed z-50 transition-all duration-300 ease-in-out flex flex-col overflow-hidden shadow-2xl backdrop-blur-2xl border border-cyan-400/40 bg-gradient-to-b from-[#062534]/98 via-[#083348]/98 to-[#051c27]/98 text-white ${
          isMaximized
            ? "inset-2 sm:inset-6 rounded-2xl"
            : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[480px] h-[80vh] sm:h-[620px] max-h-[720px] rounded-2xl"
        }`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Animated header beam */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden rounded-t-2xl">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-beam-slide" />
        </div>

        {/* Drag & Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cyan-950/90 border-2 border-dashed border-cyan-300 rounded-2xl p-6 text-center backdrop-blur-md">
            <Paperclip className="size-12 text-cyan-300 animate-bounce mb-3" />
            <p className="text-lg font-bold text-white">Drop file to attach</p>
            <p className="text-xs text-cyan-200/80 mt-1">Images, videos, or documents</p>
          </div>
        )}

        {/* Header Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-cyan-400/20 bg-cyan-950/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/20 text-cyan-200">
              <Sparkles className="size-4 text-cyan-300 animate-pulse" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[#062534] ${
                  isConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
                title={isConnected ? "WebSocket connected" : "Connecting..."}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-[240px]">
                  #{workspace.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] rounded-full border border-cyan-400/40 bg-cyan-950/70 px-2 py-0.2 font-semibold text-cyan-200">
                  <Users className="size-2.5" />
                  <span>{membersCount}</span>
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/70 truncate">
                {isConnected ? "Real-time Team Chat" : "Connecting to chat room..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Search Toggle */}
            <button
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                isSearchOpen ? "bg-cyan-400/30 text-white" : "text-cyan-200/80 hover:bg-cyan-900/60 hover:text-white"
              }`}
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery("");
              }}
              title="Search messages"
              type="button"
            >
              <Search className="size-4" />
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              className="rounded-lg p-1.5 text-cyan-200/80 hover:bg-cyan-900/60 hover:text-white transition-colors cursor-pointer"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore size" : "Maximize chat window"}
              type="button"
            >
              {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {/* Close */}
            <button
              className="rounded-lg p-1.5 text-cyan-200/80 hover:bg-rose-900/60 hover:text-rose-200 transition-colors cursor-pointer"
              onClick={onClose}
              title="Close chat"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* Search Bar (Collapsible) */}
        {isSearchOpen && (
          <div className="px-3 py-2 border-b border-cyan-400/20 bg-cyan-950/60 flex items-center gap-2 animate-fade-in shrink-0">
            <Search className="size-3.5 text-cyan-300 shrink-0" />
            <input
              autoFocus
              className="w-full bg-transparent text-xs text-white placeholder-cyan-200/50 outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by text, teammate, or file..."
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="text-cyan-200/70 hover:text-white"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Chat Messages Scroll Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cyan-200/70">
              <div className="size-14 rounded-2xl border border-cyan-300/30 bg-cyan-900/30 flex items-center justify-center mb-3">
                <Users className="size-7 text-cyan-300" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {searchQuery ? "No matching messages found" : `Welcome to #${workspace.name}!`}
              </h3>
              <p className="text-xs max-w-xs text-cyan-200/80 leading-relaxed">
                {searchQuery
                  ? "Try searching for a different keyword, name, or filename."
                  : "This is your workspace's dedicated chat room. Share sprint updates, files, images, and videos with your team leads and members."}
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const isOwn = currentUser && message.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
              const isLead = message.senderEmail.toLowerCase() === leadEmail.toLowerCase();

              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 max-w-[88%] sm:max-w-[80%] ${
                    isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Sender Avatar */}
                  <img
                    alt={message.senderName}
                    className="size-7 sm:size-8 rounded-full object-cover ring-1 ring-cyan-300/40 shrink-0 mt-0.5 shadow-sm"
                    src={getAvatarUrl(message.senderName, message.senderGender)}
                  />

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} min-w-0`}>
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                      <span className="font-semibold text-white truncate max-w-[120px]">
                        {isOwn ? "You" : message.senderName}
                      </span>

                      {isLead ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 px-1.5 py-0.2 text-[9px] font-bold">
                          <Crown className="size-2.5" />
                          <span>Lead</span>
                        </span>
                      ) : message.senderRole ? (
                        <span className="inline-flex items-center rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 px-1.5 py-0.2 text-[9px] font-medium">
                          {message.senderRole}
                        </span>
                      ) : null}

                      <span className="text-[10px] text-cyan-200/50">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-md backdrop-blur-md transition-all ${
                        isOwn
                          ? "bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 text-white rounded-tr-xs border border-cyan-300/40"
                          : "bg-[#0b3347]/90 text-slate-100 rounded-tl-xs border border-cyan-400/30 shadow-inner"
                      }`}
                    >
                      {/* Message Text */}
                      {message.content && (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}

                      {/* Attachment: Image */}
                      {message.attachment && message.attachment.type === "image" && (
                        <div
                          className={`mt-2 overflow-hidden rounded-xl border border-white/20 bg-black/30 group cursor-pointer relative ${
                            message.content ? "pt-1" : ""
                          }`}
                          onClick={() => setActiveLightboxMedia(message.attachment ?? null)}
                        >
                          <img
                            alt={message.attachment.name}
                            className="max-h-56 w-auto max-w-full rounded-lg object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                            loading="lazy"
                            src={message.attachment.url}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="text-white text-xs font-semibold px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs flex items-center gap-1">
                              <Maximize2 className="size-3" /> View Photo
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Attachment: Video */}
                      {message.attachment && message.attachment.type === "video" && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                          <video
                            className="max-h-56 w-full rounded-lg object-cover"
                            controls
                            preload="metadata"
                            src={message.attachment.url}
                          />
                          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-cyan-100 bg-cyan-950/60 border-t border-white/10">
                            <span className="truncate max-w-[160px] font-medium flex items-center gap-1">
                              <Film className="size-3" />
                              {message.attachment.name}
                            </span>
                            <a
                              className="text-cyan-300 hover:text-white inline-flex items-center gap-1 font-semibold"
                              download={message.attachment.name}
                              href={message.attachment.url}
                              title="Download video"
                            >
                              <Download className="size-3" />
                              <span>{formatFileSize(message.attachment.size)}</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Attachment: Generic File / Document */}
                      {message.attachment && message.attachment.type === "file" && (
                        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-cyan-950/60 p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                              <FileText className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-white truncate max-w-[150px] sm:max-w-[200px]">
                                {message.attachment.name}
                              </p>
                              <p className="text-[10px] text-cyan-200/70">
                                {formatFileSize(message.attachment.size)}
                              </p>
                            </div>
                          </div>

                          <a
                            className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-2.5 py-1 text-xs font-bold shrink-0 transition-colors shadow-2xs"
                            download={message.attachment.name}
                            href={message.attachment.url}
                            rel="noreferrer"
                            target="_blank"
                            title="Download file"
                          >
                            <Download className="size-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 text-[11px] text-cyan-300 flex items-center gap-2 bg-cyan-950/30 border-t border-cyan-400/10 shrink-0 animate-pulse">
            <span className="flex space-x-1">
              <span className="size-1.5 rounded-full bg-cyan-300 animate-bounce" />
              <span className="size-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:0.2s]" />
              <span className="size-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>
              {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        {/* Attachment Preview Strip (Selected File before sending) */}
        {selectedFile && (
          <div className="px-3 py-2 bg-cyan-950/70 border-t border-cyan-400/20 flex items-center justify-between gap-3 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              {filePreviewUrl && selectedFile.type.startsWith("image/") ? (
                <img
                  alt="preview"
                  className="size-10 rounded-lg object-cover border border-cyan-300/40"
                  src={filePreviewUrl}
                />
              ) : selectedFile.type.startsWith("video/") ? (
                <div className="size-10 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-300/40">
                  <Video className="size-5" />
                </div>
              ) : (
                <div className="size-10 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-300/40">
                  <FileText className="size-5" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-cyan-200/70">
                  {formatFileSize(selectedFile.size)} • Ready to send
                </p>
              </div>
            </div>

            <button
              className="rounded-full bg-cyan-900/60 hover:bg-rose-900/60 text-cyan-200 hover:text-rose-200 p-1 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedFile(null);
                setFilePreviewUrl(null);
              }}
              title="Remove attachment"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Input Bar & Actions */}
        <footer className="p-3 border-t border-cyan-400/20 bg-cyan-950/50 shrink-0">
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            className="hidden"
            onChange={handleSelectFile}
            type="file"
          />
          <input
            ref={imageInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleSelectFile}
            type="file"
          />
          <input
            ref={videoInputRef}
            accept="video/*"
            className="hidden"
            onChange={handleSelectFile}
            type="file"
          />

          <div className="flex items-end gap-2">
            {/* Attachment buttons */}
            <div className="flex items-center gap-1 shrink-0 pb-1">
              <button
                className="rounded-lg p-2 text-cyan-200/80 hover:bg-cyan-900/70 hover:text-white transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Document or File"
                type="button"
              >
                <Paperclip className="size-4" />
              </button>

              <button
                className="rounded-lg p-2 text-cyan-200/80 hover:bg-cyan-900/70 hover:text-white transition-colors cursor-pointer"
                onClick={() => imageInputRef.current?.click()}
                title="Share Image"
                type="button"
              >
                <ImageIcon className="size-4" />
              </button>

              <button
                className="rounded-lg p-2 text-cyan-200/80 hover:bg-cyan-900/70 hover:text-white transition-colors cursor-pointer"
                onClick={() => videoInputRef.current?.click()}
                title="Share Video"
                type="button"
              >
                <Video className="size-4" />
              </button>
            </div>

            {/* Message Textarea */}
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                className="w-full max-h-24 resize-none rounded-xl border border-cyan-300/30 bg-cyan-950/60 px-3 py-2 text-xs sm:text-sm text-white placeholder-cyan-200/50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 custom-scrollbar"
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`Message #${workspace.name}...`}
                rows={1}
                value={inputText}
              />
            </div>

            {/* Send Button */}
            <button
              className={`rounded-xl p-2.5 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                inputText.trim() || selectedFile
                  ? "bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25 active:scale-95"
                  : "bg-cyan-900/40 text-cyan-200/40 cursor-not-allowed"
              }`}
              disabled={(!inputText.trim() && !selectedFile) || isSending}
              onClick={() => void handleSend()}
              title="Send message (Enter)"
              type="button"
            >
              <Send className="size-4" />
            </button>
          </div>
        </footer>
      </div>

      {/* Lightbox Media Modal */}
      <ChatMediaLightbox
        attachment={activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
      />
    </>,
    document.body
  );
};
