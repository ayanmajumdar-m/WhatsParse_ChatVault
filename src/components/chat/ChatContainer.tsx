"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { List } from "react-window";
import { useChatStore } from "../../stores/chatStore";
import { ChatMessage } from "../../types";
import AudioBubble from "./AudioBubble";
import DateSeparator from "./DateSeparator";
import DocumentBubble from "./DocumentBubble";
import ImageBubble from "./ImageBubble";
import TextBubble from "./TextBubble";
import VideoBubble from "./VideoBubble";

// Type representing either a ChatMessage or a Date Separator in the flow
type StreamItem =
  | { type: "message"; data: ChatMessage; showSender: boolean; spacing: "close" | "normal" }
  | { type: "date"; timestamp: number; key: string };

// Row component for react-window v2
// v2 spreads rowProps + passes index, style, ariaAttributes
function ChatRow({
  index,
  style,
  streamItems,
}: {
  index: number;
  style: React.CSSProperties;
  streamItems: StreamItem[];
  ariaAttributes?: Record<string, unknown>;
}) {
  const item = streamItems[index];
  if (!item) return null;

  if (item.type === "date") {
    return (
      <div style={style}>
        <DateSeparator timestamp={item.timestamp} />
      </div>
    );
  }

  const msg = item.data;
  const spacingClass = item.spacing === "close" ? "pt-1" : "pt-3.5";

  return (
    <div
      style={style}
      className={`flex flex-col px-4 sm:px-10 lg:px-16 ${spacingClass} transition-all duration-200`}
    >
      {msg.type === "system" || msg.sender === "System" ? (
        <div className="my-2 flex items-center justify-center self-center max-w-[85%] sm:max-w-[70%] select-none">
          <span className="rounded-xl border border-slate-100 bg-white/60 px-4 py-2 text-center text-xs font-semibold leading-relaxed text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 backdrop-blur-sm">
            {msg.content}
          </span>
        </div>
      ) : msg.type === "audio" ? (
        <AudioBubble message={msg} showSender={item.showSender} />
      ) : msg.type === "image" ? (
        <ImageBubble message={msg} showSender={item.showSender} />
      ) : msg.type === "video" ? (
        <VideoBubble message={msg} showSender={item.showSender} />
      ) : msg.type === "document" ? (
        <DocumentBubble message={msg} showSender={item.showSender} />
      ) : (
        <TextBubble message={msg} showSender={item.showSender} />
      )}
    </div>
  );
}

// Row height calculator — receives (index, rowProps) per react-window v2 API
function getRowHeight(
  index: number,
  rowProps: { streamItems: StreamItem[] }
): number {
  const item = rowProps.streamItems[index];
  if (!item) return 40;

  if (item.type === "date") return 40;

  const msg = item.data;

  // System messages
  if (msg.type === "system" || msg.sender === "System") {
    return Math.max(50, Math.floor(msg.content.length / 60) * 16 + 32);
  }

  const spacingPadding = item.spacing === "close" ? 6 : 14;
  const headerPadding = item.showSender && !msg.isMine ? 20 : 0;

  if (msg.type === "audio") return 78 + headerPadding + spacingPadding;
  if (msg.type === "image") return 290 + headerPadding + spacingPadding;
  if (msg.type === "video") return 210 + headerPadding + spacingPadding;
  if (msg.type === "document") return 100 + headerPadding + spacingPadding;

  // Pure emoji check
  const cleanedEmojiText = msg.content.replace(/\s+/g, "");
  const isPureEmoji =
    /^[\p{Emoji}\s]{1,6}$/u.test(cleanedEmojiText) &&
    /\p{Emoji_Presentation}/u.test(cleanedEmojiText);

  if (isPureEmoji) return 56 + spacingPadding;

  // Text height estimation
  const charsPerLine = 50;
  const textLines = Math.max(1, Math.ceil(msg.content.length / charsPerLine));
  const textHeight = textLines * 19;

  return textHeight + 40 + headerPadding + spacingPadding;
}

export default function ChatContainer() {
  const { messages, searchResults, searchCurrentIndex } = useChatStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Group messages and inject date separators dynamically
  const streamItems = useMemo<StreamItem[]>(() => {
    const items: StreamItem[] = [];
    if (messages.length === 0) return items;

    let lastDateLabel = "";

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const dateLabel = new Date(msg.timestamp).toDateString();

      // Inject date separators when the day changes
      if (dateLabel !== lastDateLabel) {
        items.push({
          type: "date",
          timestamp: msg.timestamp,
          key: `date-${msg.timestamp}-${i}`,
        });
        lastDateLabel = dateLabel;
      }

      // Check grouping rules: consecutive messages from same sender within 2 mins
      let showSender = true;
      let spacing: "close" | "normal" = "normal";

      if (i > 0) {
        const prevMsg = messages[i - 1];
        const prevDateLabel = new Date(prevMsg.timestamp).toDateString();
        const timeDiff =
          Math.abs(msg.timestamp - prevMsg.timestamp) / 1000 / 60;

        if (
          prevMsg.sender === msg.sender &&
          prevMsg.type !== "system" &&
          msg.type !== "system" &&
          dateLabel === prevDateLabel &&
          timeDiff <= 2
        ) {
          showSender = false;
          spacing = "close";
        }
      }

      items.push({
        type: "message",
        data: msg,
        showSender,
        spacing,
      });
    }

    return items;
  }, [messages]);

  // Automatically scroll virtual list to center active search result
  // v2 ref exposes scrollToRow({ index, align, behavior })
  useEffect(() => {
    if (
      searchCurrentIndex >= 0 &&
      searchResults[searchCurrentIndex] !== undefined
    ) {
      const matchMsgIndex = searchResults[searchCurrentIndex];
      const matchMsg = messages[matchMsgIndex];

      if (!matchMsg) return;

      const streamIdx = streamItems.findIndex(
        (item) => item.type === "message" && item.data.id === matchMsg.id
      );

      if (streamIdx !== -1) {
        listRef.current?.scrollToRow({
          index: streamIdx,
          align: "center",
        });
      }
    }
  }, [searchCurrentIndex, searchResults, messages, streamItems]);

  return (
    <div
      className="relative min-h-0 flex-1 bg-slate-50/30 dark:bg-slate-950/20"
      style={{
        backgroundImage:
          "radial-gradient(rgba(148, 163, 184, 0.08) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
    >
      {streamItems.length === 0 ? (
        <div className="flex h-full items-center justify-center text-slate-400">
          No messages to display.
        </div>
      ) : (
        <List
          listRef={listRef}
          rowCount={streamItems.length}
          rowHeight={getRowHeight}
          rowComponent={ChatRow}
          rowProps={{ streamItems }}
          overscanCount={5}
          style={{ height: "100%", minHeight: 0 }}
          className="scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800"
        />
      )}
    </div>
  );
}
