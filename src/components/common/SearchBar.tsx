"use client";

import { ChevronDown, ChevronUp, X, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useChatStore } from "../../stores/chatStore";

interface SearchBarProps {
  onClose: () => void;
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchCurrentIndex,
    nextSearchResult,
    prevSearchResult,
  } = useChatStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        prevSearchResult();
      } else {
        nextSearchResult();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const hasResults = searchResults.length > 0;
  const matchInfoLabel = hasResults
    ? `${searchCurrentIndex + 1} of ${searchResults.length}`
    : "No matches";

  return (
    <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 dark:border-slate-800/80 dark:bg-slate-800/20 shadow-inner animate-slide-down">
      <div className="flex flex-1 items-center gap-3">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages or senders..."
          className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none dark:text-slate-300"
        />
        
        {searchQuery && (
          <button
            onClick={handleClear}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-400 select-none">
          {searchQuery ? matchInfoLabel : "Enter search term"}
        </span>

        {hasResults && (
          <div className="flex items-center gap-1">
            <button
              onClick={prevSearchResult}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-700/50"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={nextSearchResult}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-700/50"
              title="Next match (Enter)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
          title="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
