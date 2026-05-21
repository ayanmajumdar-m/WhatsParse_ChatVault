"use client";

import { FileText, Plus, Trash2, History, Database } from "lucide-react";
import { useEffect } from "react";
import { useChatStore } from "../../stores/chatStore";

interface SidebarProps {
  onImportClick: () => void;
}

export default function Sidebar({ onImportClick }: SidebarProps) {
  const { chats, selectedChatId, loadAllChats, selectChat, deleteChat, isLoading } = useChatStore();

  useEffect(() => {
    loadAllChats();
  }, [loadAllChats]);

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50 md:w-80 lg:w-96">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800/80 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Database className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight bg-linear-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
            ChatVault
          </h1>
        </div>

        <button
          onClick={onImportClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors duration-200"
          title="Import exported chat"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Chats list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <History className="h-3.5 w-3.5" />
          Recent Exports
        </div>

        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
              No chat logs imported yet.
            </p>
            <button
              onClick={onImportClick}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-500 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              Import First Chat
            </button>
          </div>
        ) : (
          chats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 ${
                  isSelected
                    ? "bg-white dark:bg-slate-800 shadow-md shadow-indigo-500/5 border-l-4 border-indigo-500"
                    : "hover:bg-white/50 dark:hover:bg-slate-800/30 border-l-4 border-transparent"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`mt-0.5 rounded-lg p-2 ${
                    isSelected 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {chat.metadata.chatName}
                    </h3>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      {chat.metadata.totalMessages.toLocaleString()} messages
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400/80">
                      {chat.metadata.startDate} - {chat.metadata.endDate}
                    </p>
                  </div>
                </div>

                {/* Delete button (displays on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this chat history?")) {
                      deleteChat(chat.id);
                    }
                  }}
                  className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400 md:opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Delete chat log"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Storage summary info */}
      <div className="border-t border-slate-100 p-4 bg-white dark:border-slate-800/80 dark:bg-slate-900 text-center text-[10px] font-medium text-slate-400">
        🔐 Client-Side Processing • Offline Focused
      </div>
    </aside>
  );
}
