"use client";

import { useState } from "react";
import { useChatStore } from "../../stores/chatStore";
import ChatContainer from "../chat/ChatContainer";
import UploadZone from "../common/UploadZone";
import SearchBar from "../common/SearchBar";
import MediaViewer from "../media/MediaViewer";
import ChatHeader from "./ChatHeader";
import Sidebar from "./Sidebar";
import { MessageSquare, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export default function ChatLayout() {
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* 1. Sidebar Panel (Visible on Desktop; Hidden on Mobile if a chat is active) */}
      <div className={`h-full min-h-0 ${selectedChatId ? "hidden md:flex" : "flex w-full md:w-auto"}`}>
        <Sidebar />
      </div>

      {/* 2. Main Workspace Viewer */}
      <div className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900 ${
        !selectedChatId ? "hidden md:flex" : "flex"
      }`}>
        {selectedChatId ? (
          // Active Chat view
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatHeader
              onToggleSearch={() => setShowSearch(!showSearch)}
              showSearchBar={showSearch}
            />
            {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
            <ChatContainer />
          </div>
        ) : (
          // Landing/Welcome state with interactive UploadZone
          <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 text-center overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20"
            style={{
              backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.06) 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="mb-10 max-w-lg">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-200 bg-clip-text text-transparent sm:text-4xl">
                Offline WhatsApp Chat Viewer
              </h2>
              <p className="mt-4 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                Read, search, and relive your WhatsApp exported conversations.
                Parsed entirely in-browser. Zero server uploads.
              </p>
            </div>

            {/* Central File Drop Panel */}
            <UploadZone />

            {/* Privacy & Performance Badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-slate-400 select-none">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                100% Secure & Offline
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Cpu className="h-4 w-4 text-indigo-500" />
                Handles 100k+ Messages
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Fullscreen Media Gallery overlay */}
      <MediaViewer />
    </div>
  );
}
