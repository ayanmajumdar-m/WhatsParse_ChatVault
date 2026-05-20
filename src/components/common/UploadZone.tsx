"use client";

import JSZip from "jszip";
import { AlertCircle, FileText, Loader2, UploadCloud } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useChatStore } from "../../stores/chatStore";

export default function UploadZone() {
  const { importChat, isLoading, parseProgress } = useChatStore();
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreTxtCandidate = useCallback((name: string, zipBaseName: string) => {
    const lowerName = name.toLowerCase();
    const baseName = lowerName.split("/").pop() || lowerName;

    let score = 0;
    if (baseName === `${zipBaseName}.txt`) score += 100;
    if (baseName.includes(zipBaseName)) score += 50;
    if (lowerName.includes("whatsapp")) score += 25;
    if (lowerName.includes("chat")) score += 20;
    if (!lowerName.startsWith("__macosx")) score += 5;

    return score;
  }, []);

  const readZipText = useCallback(async (zipEntry: any) => {
    const bytes = await zipEntry.async("uint8array");

    const decoders = ["utf-8", "utf-16le", "utf-16be"];
    for (const encoding of decoders) {
      try {
        return new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/, "");
      } catch {
        continue;
      }
    }

    return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension !== "txt" && extension !== "zip") {
        setError("Unsupported file format. Please upload a WhatsApp exported .txt or .zip file.");
        return;
      }

      try {
        if (extension === "txt") {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
              setError("Failed to read text file content.");
              return;
            }
            try {
              await importChat(file.name, text, []);
            } catch (err: any) {
              setError(err.message || "Failed to parse chat log.");
            }
          };
          reader.onerror = () => setError("Failed to read file.");
          reader.readAsText(file, "utf-8");
        } else if (extension === "zip") {
          // Parse ZIP file in-browser
          const zip = await JSZip.loadAsync(file);

          const zipBaseName = file.name.replace(/\.zip$/i, "").toLowerCase();
          const txtFileNames = Object.keys(zip.files)
            .filter((name) => !zip.files[name].dir && name.toLowerCase().endsWith(".txt"))
            .sort((a, b) => scoreTxtCandidate(b, zipBaseName) - scoreTxtCandidate(a, zipBaseName));

          if (txtFileNames.length === 0) {
            setError("No chat history log (.txt) found inside the ZIP file.");
            return;
          }

          let txtContent = "";
          for (const txtFileName of txtFileNames) {
            txtContent = await readZipText(zip.files[txtFileName]);
            if (txtContent.trim()) {
              break;
            }
          }

          if (!txtContent.trim()) {
            setError("The ZIP file did not contain a readable chat log.");
            return;
          }

          // Extract all media files
          const mediaFiles: Array<{ name: string; blob: Blob }> = [];
          const mediaEntries = Object.entries(zip.files).filter(
            ([name, fileEntry]) => !fileEntry.dir && !name.toLowerCase().endsWith(".txt")
          );

          for (const [name, entry] of mediaEntries) {
            const blob = await entry.async("blob");
            // Standardize path (remove folders if nested)
            const cleanName = name.split("/").pop() || name;
            mediaFiles.push({ name: cleanName, blob });
          }

          await importChat(file.name, txtContent, mediaFiles);
        }
      } catch (err: any) {
        console.error("Upload process error", err);
        setError("Failed to process file. The ZIP archive might be corrupted or in an unexpected format.");
      }
    },
    [importChat]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  // Render progress states beautifully
  if (isLoading && parseProgress) {
    const percentage = parseProgress.percentage || 0;
    const phaseLabel =
      parseProgress.phase === "reading"
        ? "Reading export file..."
        : parseProgress.phase === "parsing"
        ? `Parsing messages... (${parseProgress.currentLine} lines)`
        : parseProgress.phase === "indexing"
        ? "Indexing media files..."
        : "Finalizing import...";

    return (
      <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 p-6 sm:p-12 text-center backdrop-blur-md shadow-xl dark:border-slate-800/80 dark:bg-slate-900/70">
        <Loader2 className="mb-6 h-12 w-12 animate-spin text-indigo-500" />
        <h3 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">
          Importing Chat Vault
        </h3>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {phaseLabel}
        </p>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-violet-600 transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          {percentage}% Complete
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-xl">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all duration-300 backdrop-blur-md shadow-xl cursor-pointer ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/20 scale-[1.01]"
            : "border-slate-200 bg-white/60 hover:border-indigo-400 hover:bg-white/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500 dark:hover:bg-slate-900/80"
        }`}
      >
        <input
          type="file"
          id="chat-upload-input"
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          accept=".txt,.zip"
          onChange={handleFileInput}
        />
        
        <div className="mb-6 rounded-2xl bg-indigo-50 p-4 text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-md">
          <UploadCloud className="h-10 w-10" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
          Upload WhatsApp exported chat
        </h3>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 max-w-xs sm:max-w-sm">
          Drag and drop your exported <strong className="text-indigo-500 font-medium">ZIP</strong> (with media) or <strong className="text-indigo-500 font-medium">TXT</strong> chat log here
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1.5 dark:bg-slate-800/80 dark:text-slate-300">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            ZIP (includes Media)
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1.5 dark:bg-slate-800/80 dark:text-slate-300">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            TXT-only Export
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/20 dark:text-red-400 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
          <p className="font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
