"use client";

import { Calendar, Search, Users, ArrowLeft } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";

interface ChatHeaderProps {
  onToggleSearch: () => void;
  showSearchBar: boolean;
}

export default function ChatHeader({ onToggleSearch, showSearchBar }: ChatHeaderProps) {
  const { metadata, currentUser, setCurrentUser, selectChat } = useChatStore();

  if (!metadata) return null;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        <button
          onClick={() => selectChat("")}
          className="mr-1 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-45 sm:max-w-70">
            {metadata.chatName}
          </h2>
          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {metadata.startDate} - {metadata.endDate}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              {metadata.participants.length} senders
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Identity Picker */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-slate-400 lg:inline">
            My Identity:
          </span>
          <select
            value={currentUser || ""}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-indigo-500 max-w-30 sm:max-w-45 truncate shadow-sm transition-colors duration-200"
          >
            {metadata.participants.map((sender) => (
              <option key={sender} value={sender}>
                {sender}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Search */}
        <button
          onClick={onToggleSearch}
          className={`rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
            showSearchBar
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
              : ""
          }`}
          title="Search conversation"
        >
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </header>
  );
}
