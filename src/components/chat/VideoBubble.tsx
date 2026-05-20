"use client";

import { Film, Loader2, Play } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../../stores/chatStore";
import { ChatMessage } from "../../types";

interface VideoBubbleProps {
  message: ChatMessage;
  showSender: boolean;
}

export default function VideoBubble({ message, showSender }: VideoBubbleProps) {
  const { getMediaUrl, openLightbox } = useChatStore();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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
            setVideoUrl(url);
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
      {/* Sender Label */}
      {!message.isMine && showSender && (
        <span className="mb-1.5 ml-2.5 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          {message.sender}
        </span>
      )}

      {/* Video Container */}
      <div
        onClick={() => !failed && !isLoading && openLightbox(message.id)}
        className="relative aspect-video w-full min-w-[180px] sm:min-w-[280px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer"
      >
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : failed || !videoUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <Film className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400/80">
              Video Missing
            </span>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {/* Native Video element as placeholder preview */}
            <video
              src={videoUrl}
              preload="metadata"
              className="h-full w-full object-cover opacity-80"
              muted
            />
            {/* Play Glassmorphic Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors duration-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md shadow-lg border border-white/30 hover:scale-110 active:scale-95 transition-all duration-300">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Label */}
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
