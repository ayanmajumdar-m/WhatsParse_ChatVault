"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "../../stores/chatStore";
import ChatContainer from "../chat/ChatContainer";
import UploadZone from "../common/UploadZone";
import SearchBar from "../common/SearchBar";
import MediaViewer from "../media/MediaViewer";
import ChatHeader from "./ChatHeader";
import Sidebar from "./Sidebar";
import { MessageSquare, ShieldCheck, Cpu } from "lucide-react";

export default function ChatLayout() {
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const [showSearch, setShowSearch] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);

  const showUploadLanding = !selectedChatId && showImportPanel;

  const uploadLanding = (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50/50 p-6 text-center dark:bg-slate-950/20 sm:p-12"
      style={{
        backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.06) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="mb-10 w-full max-w-lg">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h2 className="bg-linear-to-r from-slate-800 to-slate-900 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-slate-100 dark:to-slate-200 sm:text-4xl">
          Offline WhatsApp Chat Viewer
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400">
          Read, search, and relive your WhatsApp exported conversations.
          Parsed entirely in-browser. Zero server uploads.
        </p>
      </div>

      <UploadZone />

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setShowImportPanel(false)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          Back to chats
        </button>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 sm:text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          100% Secure & Offline
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold text-slate-400 sm:mt-12 sm:text-xs">
        <Cpu className="h-4 w-4 text-indigo-500" />
        Handles 100k+ Messages
      </div>
    </div>
  );

  const handleImportClick = () => {
    if (!selectedChatId) {
      setShowImportPanel(true);
    }
  };

  useEffect(() => {
    if (selectedChatId) {
      setShowImportPanel(false);
    }
  }, [selectedChatId]);

  let mainContent: React.ReactNode = null;

  if (selectedChatId) {
    mainContent = (
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatHeader onToggleSearch={() => setShowSearch(!showSearch)} showSearchBar={showSearch} />
        {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
        <ChatContainer />
      </div>
    );
  } else if (showUploadLanding) {
    mainContent = uploadLanding;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* 1. Sidebar Panel (Visible on Desktop; Hidden on Mobile if a chat is active) */}
      <div
        className={`h-full min-h-0 ${
          showUploadLanding ? "hidden" : selectedChatId ? "hidden md:flex" : "flex w-full md:w-auto"
        }`}
      >
        <Sidebar onImportClick={handleImportClick} />
      </div>

      {/* 2. Main Workspace Viewer */}
      <div
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900 ${
          selectedChatId || showUploadLanding ? "flex" : "hidden"
        }`}
      >
        {mainContent}
      </div>

      {/* 3. Fullscreen Media Gallery overlay */}
      <MediaViewer />
    </div>
  );
}
