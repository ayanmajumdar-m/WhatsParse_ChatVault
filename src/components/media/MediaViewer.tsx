"use client";

import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatStore } from "../../stores/chatStore";

export default function MediaViewer() {
  const {
    messages,
    activeLightboxMessageId,
    closeLightbox,
    nextLightboxItem,
    prevLightboxItem,
    getMediaUrl,
  } = useChatStore();

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const activeMsg = messages.find((m) => m.id === activeLightboxMessageId);

  // Load Blob Object URL dynamically
  useEffect(() => {
    if (!activeMsg || !activeMsg.mediaPath) {
      setMediaUrl(null);
      return;
    }

    let isSubscribed = true;
    getMediaUrl(activeMsg.mediaPath).then((url) => {
      if (isSubscribed) {
        setMediaUrl(url);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [activeMsg, getMediaUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeLightboxMessageId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") nextLightboxItem();
      else if (e.key === "ArrowLeft") prevLightboxItem();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxMessageId, closeLightbox, nextLightboxItem, prevLightboxItem]);

  if (!activeLightboxMessageId || !activeMsg) return null;

  // Filter all media for navigation indexes
  const mediaMessages = messages.filter((m) => m.type === "image" || m.type === "video");
  const currentIndex = mediaMessages.findIndex((m) => m.id === activeLightboxMessageId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{activeMsg.sender}</span>
          <span className="text-xs text-slate-400">
            {new Date(activeMsg.timestamp).toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {mediaUrl && (
            <a
              href={mediaUrl}
              download={activeMsg.mediaPath || "download"}
              className="rounded-full bg-slate-800/80 p-2.5 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors duration-200"
              title="Download file"
            >
              <Download className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={closeLightbox}
            className="rounded-full bg-slate-800/80 p-2.5 text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main viewer viewport */}
      <div className="relative flex flex-1 items-center justify-center p-4">
        {/* Navigation Left */}
        {currentIndex > 0 && (
          <button
            onClick={prevLightboxItem}
            className="absolute left-6 z-10 rounded-full bg-slate-800/60 p-3 text-slate-200 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 duration-200 shadow-lg"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Media content */}
        <div className="flex h-full max-h-[80vh] w-full max-w-[90vw] items-center justify-center">
          {!mediaUrl ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
              <span className="text-sm font-medium">Loading attachment...</span>
            </div>
          ) : activeMsg.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt={activeMsg.mediaPath || "Image"}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-300"
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>

        {/* Navigation Right */}
        {currentIndex < mediaMessages.length - 1 && (
          <button
            onClick={nextLightboxItem}
            className="absolute right-6 z-10 rounded-full bg-slate-800/60 p-3 text-slate-200 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 duration-200 shadow-lg"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom pagination tracker */}
      <div className="p-6 text-center text-xs font-medium text-slate-500">
        Media {currentIndex + 1} of {mediaMessages.length} • {activeMsg.mediaPath}
      </div>
    </div>
  );
}
