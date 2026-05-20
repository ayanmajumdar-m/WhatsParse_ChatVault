"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../../stores/chatStore";
import { ChatMessage } from "../../types";

interface ImageBubbleProps {
  message: ChatMessage;
  showSender: boolean;
}

export default function ImageBubble({ message, showSender }: ImageBubbleProps) {
  const { getMediaUrl, openLightbox } = useChatStore();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!message.mediaPath) {
      setIsLoading(false);
      setFailed(true);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);

    getMediaUrl(message.mediaPath)
      .then((url) => {
        if (isSubscribed) {
          if (url) {
            setImageUrl(url);
          } else {
            setFailed(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setFailed(true);
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
      className={`group relative flex flex-col rounded-2xl p-1.5 max-w-[80%] sm:max-w-[50%] shadow-sm ${
        message.isMine
          ? "self-end bg-indigo-600 text-white rounded-tr-none"
          : "self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/40 rounded-tl-none"
      }`}
    >
      {/* Sender name */}
      {!message.isMine && showSender && (
        <span className="mb-1.5 ml-2.5 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          {message.sender}
        </span>
      )}

      {/* Image Preview Container */}
      <div
        onClick={() => !failed && !isLoading && openLightbox(message.id)}
        className="relative aspect-square w-full min-w-[160px] sm:min-w-[240px] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer group-hover:opacity-95 transition-opacity duration-200"
      >
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : failed || !imageUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400/80">
              Media Missing
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={message.mediaPath}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>

      {/* Image Label & Footer */}
      <div className="flex items-center justify-between px-2.5 py-1.5 mt-0.5">
        <span className="truncate text-[10px] max-w-[70%] font-semibold tracking-wide text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400 select-none">
          {message.mediaPath}
        </span>
        <span className={`text-[9px] font-semibold tracking-wide uppercase select-none ${
          message.isMine ? "text-indigo-200/80" : "text-slate-400"
        }`}>
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
