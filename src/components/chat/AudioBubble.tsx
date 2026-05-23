"use client";

import { Mic, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useActiveAudio } from "@/hooks/useActiveAudio";
import { audioManager } from "@/services/audioManager";
import { nativeAudio } from "@/services/nativeAudio";
import { ChatMessage } from "../../types";

interface AudioBubbleProps {
  message: ChatMessage;
  showSender: boolean;
}

// Format duration: seconds into m:ss
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function AudioBubble({ message, showSender }: AudioBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any | null>(null);

  const {
    isCurrentActive,
    isPlaying,
    currentTime,
    duration,
    speed,
    togglePlay,
    cycleSpeed,
  } = useActiveAudio(message.id, message.mediaPath || "");

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [message.timestamp]);

  // Instantiate WaveSurfer ONLY when this voice note is active
  useEffect(() => {
    let cancelled = false;

    const destroyWaveSurfer = () => {
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (err) {
          console.warn("Failed to destroy WaveSurfer instance", err);
        }
        wavesurferRef.current = null;
      }
    };

    destroyWaveSurfer();

    if (!isCurrentActive || !containerRef.current) {
      return;
    }

    // If a native plugin is active on Android then we cannot attach
    // WaveSurfer to a native player — fall back to static placeholder.
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
    if (isAndroid && nativeAudio.isAvailable()) {
      return;
    }

    const nativeAudioElem = audioManager.getAudioElement();
    if (!nativeAudioElem) return;

    // Load wavesurfer dynamically on client side
    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (cancelled || !containerRef.current) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        media: nativeAudioElem,
        waveColor: message.isMine ? "rgba(255, 255, 255, 0.4)" : "#cbd5e1",
        progressColor: message.isMine ? "#ffffff" : "#4f46e5",
        height: 28,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        cursorWidth: 0,
      });

      if (cancelled) {
        ws.destroy();
        return;
      }

      wavesurferRef.current = ws;
    });

    return () => {
      cancelled = true;
      destroyWaveSurfer();
    };
  }, [isCurrentActive, message.isMine]);

  return (
    <div
      className={`group relative flex flex-col rounded-2xl p-3.5 max-w-[85%] sm:max-w-[70%] shadow-sm ${
        message.isMine
          ? "self-end bg-linear-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none"
          : "self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700/40 rounded-tl-none"
      }`}
    >
      {/* Sender label */}
      {!message.isMine && showSender && (
        <span className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          {message.sender}
        </span>
      )}

      {/* Player Interface */}
      <div className="flex items-center gap-3.5">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 duration-200 ${
            message.isMine
              ? "bg-white text-indigo-600 hover:bg-indigo-50"
              : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/10"
          }`}
        >
          {isPlaying && isCurrentActive ? (
            <Pause className="h-4.5 w-4.5 fill-current" />
          ) : (
            <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Audio Details & Waveform Container */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Waveform area */}
          <div className="relative flex h-7 items-center min-w-30 sm:min-w-45">
            {isCurrentActive ? (
              // Active WaveSurfer container
              <div ref={containerRef} className="w-full" />
            ) : (
              // Inactive Static Waveform Placeholder (Super fast CSS bars)
              <div className="flex w-full items-center gap-0.5 select-none">
                {Array.from({ length: 30 }).map((_, idx) => {
                  // Deterministic height bars
                  const h = Math.abs(Math.sin(idx * 0.4)) * 18 + 4;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-0.5 rounded-full ${
                        message.isMine ? "bg-indigo-300/40" : "bg-slate-200"
                      }`}
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Time tracker */}
          <div className="mt-1 flex items-center justify-between text-[10px] font-semibold tracking-wide uppercase select-none">
            <span className={message.isMine ? "text-indigo-200" : "text-slate-400"}>
              {isCurrentActive
                ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                : "Voice Note"}
            </span>

            {/* Playback speed selector */}
            <button
              onClick={cycleSpeed}
              className={`rounded px-1.5 py-0.5 font-bold uppercase transition-all duration-200 border ${
                message.isMine
                  ? "border-indigo-400/40 text-indigo-100 hover:bg-white/10"
                  : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {speed}x
            </button>
          </div>
        </div>

        {/* Voice note indicator */}
        <div className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${
          message.isMine ? "bg-indigo-400/20 text-indigo-100" : "bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-400"
        }`}>
          <Mic className="h-4 w-4" />
        </div>
      </div>

      {/* Message footer timestamp */}
      <div className={`mt-1 text-right text-[9px] font-semibold tracking-wide uppercase leading-none select-none ${
        message.isMine ? "text-indigo-200/80" : "text-slate-400"
      }`}>
        {formattedTime}
      </div>
    </div>
  );
}
