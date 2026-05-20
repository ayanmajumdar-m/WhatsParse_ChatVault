"use client";

import { Download, File, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../../stores/chatStore";
import { ChatMessage } from "../../types";

interface DocumentBubbleProps {
  message: ChatMessage;
  showSender: boolean;
}

// Convert bytes into human-readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DocumentBubble({ message, showSender }: DocumentBubbleProps) {
  const { getMediaUrl } = useChatStore();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docSize, setDocSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fileExtension = useMemo(() => {
    return message.mediaPath?.split(".").pop()?.toUpperCase() || "DOC";
  }, [message.mediaPath]);

  useEffect(() => {
    if (!message.mediaPath) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);

    getMediaUrl(message.mediaPath)
      .then((url) => {
        if (isSubscribed) {
          if (url) {
            setDocUrl(url);
            // Fetch blob size
            fetch(url)
              .then((res) => res.blob())
              .then((blob) => {
                if (isSubscribed) {
                  setDocSize(blob.size);
                }
              })
              .catch((err) => console.warn("Failed to get blob size", err));
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [message.mediaPath, getMediaUrl]);

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [message.timestamp]);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl p-3 max-w-[85%] sm:max-w-[65%] shadow-sm ${
        message.isMine
          ? "self-end bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none"
          : "self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/40 rounded-tl-none"
      }`}
    >
      {/* Sender label */}
      {!message.isMine && showSender && (
        <span className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          {message.sender}
        </span>
      )}

      {/* Document Card layout */}
      <div className={`flex items-center gap-3.5 rounded-xl p-3 ${
        message.isMine
          ? "bg-white/10 text-white"
          : "bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40"
      }`}>
        {/* File icon */}
        <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg shadow-sm border ${
          message.isMine
            ? "bg-white/15 border-white/20 text-white"
            : "bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-400"
        }`}>
          <File className="h-5 w-5" />
          <span className="text-[7px] font-bold tracking-wider uppercase leading-none mt-0.5 max-w-[28px] truncate">
            {fileExtension}
          </span>
        </div>

        {/* File details */}
        <div className="flex flex-1 flex-col min-w-0">
          <span className="truncate text-xs font-semibold leading-snug">
            {message.mediaPath}
          </span>
          <span className={`text-[10px] font-medium leading-none mt-1 ${
            message.isMine ? "text-indigo-200" : "text-slate-400"
          }`}>
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </span>
            ) : docSize ? (
              formatBytes(docSize)
            ) : (
              "File attachment"
            )}
          </span>
        </div>

        {/* Download Trigger */}
        {docUrl && (
          <a
            href={docUrl}
            download={message.mediaPath || "download"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 duration-200 ${
              message.isMine
                ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
            title="Download document"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Message footer timestamp */}
      <div className={`mt-2 text-right text-[9px] font-semibold tracking-wide uppercase leading-none select-none ${
        message.isMine ? "text-indigo-200/80" : "text-slate-400"
      }`}>
        {formattedTime}
      </div>
    </div>
  );
}
