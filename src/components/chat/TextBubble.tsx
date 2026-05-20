"use client";

import { useMemo } from "react";
import { useChatStore } from "../../stores/chatStore";
import { ChatMessage } from "../../types";

interface TextBubbleProps {
  message: ChatMessage;
  showSender: boolean;
}

// Helper to escape HTML characters and prevent XSS injection
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate a premium deterministic color based on sender name hash
function getSenderColor(name: string): string {
  const colors = [
    "text-rose-500 dark:text-rose-400",
    "text-emerald-500 dark:text-emerald-400",
    "text-amber-500 dark:text-amber-400",
    "text-cyan-500 dark:text-cyan-400",
    "text-indigo-500 dark:text-indigo-400",
    "text-fuchsia-500 dark:text-fuchsia-400",
    "text-orange-500 dark:text-orange-400",
    "text-violet-500 dark:text-violet-400",
    "text-pink-500 dark:text-pink-400",
    "text-sky-500 dark:text-sky-400",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Check if message consists purely of emojis (max 3)
const EMOJI_REGEX = /^[\p{Emoji}\s]{1,6}$/u;
const IS_ONLY_EMOJI = (text: string) => {
  const cleaned = text.replace(/\s+/g, "");
  // Ensure it matches and is actually containing emoji characters
  return EMOJI_REGEX.test(cleaned) && /\p{Emoji_Presentation}/u.test(cleaned);
};

export default function TextBubble({ message, showSender }: TextBubbleProps) {
  const searchQuery = useChatStore((state) => state.searchQuery);

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [message.timestamp]);

  const isOnlyEmoji = useMemo(() => IS_ONLY_EMOJI(message.content), [message.content]);

  // Format content with HTML sanitization & search highlights
  const renderedContent = useMemo(() => {
    const escaped = escapeHtml(message.content);
    if (!searchQuery) {
      return escaped.replace(/\n/g, "<br />");
    }

    const queryEscaped = escapeHtml(searchQuery);
    const regex = new RegExp(`(${queryEscaped})`, "gi");
    
    // Highlight matched text
    const highlighted = escaped.replace(
      regex,
      `<mark class="bg-indigo-200 dark:bg-indigo-900 rounded px-0.5 font-semibold text-indigo-950 dark:text-indigo-100">$1</mark>`
    );
    
    return highlighted.replace(/\n/g, "<br />");
  }, [message.content, searchQuery]);

  const senderColorClass = useMemo(() => getSenderColor(message.sender), [message.sender]);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[70%] shadow-sm ${
        message.isMine
          ? "self-end bg-linear-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none"
          : "self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/40 rounded-tl-none"
      } ${isOnlyEmoji ? "!bg-transparent! border-none! shadow-none! !p-0! select-none" : ""}`}
    >
      {/* Sender name badge (for group chats, only for received messages) */}
      {!message.isMine && showSender && !isOnlyEmoji && (
        <span className={`mb-1 text-xs font-bold ${senderColorClass}`}>
          {message.sender}
        </span>
      )}

      {/* Message content */}
      {isOnlyEmoji ? (
        <span className="text-4xl sm:text-5xl leading-none py-1 block">
          {message.content}
        </span>
      ) : (
        <p
          className="text-[13px] sm:text-sm leading-relaxed wrap-break-word"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      )}

      {/* Date-time footer label */}
      <div
        className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-semibold tracking-wide uppercase leading-none select-none ${
          isOnlyEmoji 
            ? "text-slate-400 mt-2 bg-slate-100/60 dark:bg-slate-800/60 rounded-full px-2 py-0.5 inline-block text-right"
            : message.isMine
            ? "text-indigo-200/80"
            : "text-slate-400"
        }`}
      >
        <span>{formattedTime}</span>
      </div>
    </div>
  );
}
