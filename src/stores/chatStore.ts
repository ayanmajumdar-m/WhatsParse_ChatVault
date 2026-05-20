import { create } from "zustand";
import { parseChatText, ParserProgress } from "../parser/parser";
import { dbService } from "../services/db";
import { CachedChat, ChatMessage, ChatMetadata } from "../types";

interface ChatState {
  chats: CachedChat[];
  selectedChatId: string | null;
  messages: ChatMessage[];
  metadata: ChatMetadata | null;
  currentUser: string | null; // Senders identified as "Me"
  isLoading: boolean;
  parseProgress: ParserProgress | null;
  
  // Media URL Cache
  resolvedMediaUrls: Record<string, string>; // Maps "chatId|filename" to local Blob Object URLs
  
  // Search State
  searchQuery: string;
  searchResults: number[]; // Indices of messages that match
  searchCurrentIndex: number; // Index in searchResults array
  
  // Lightbox (Media Gallery) State
  activeLightboxMessageId: string | null;

  // Actions
  loadAllChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  importChat: (
    filename: string,
    chatText: string,
    mediaFiles: Array<{ name: string; blob: Blob }>
  ) => Promise<void>;
  setCurrentUser: (user: string) => void;
  setSearchQuery: (query: string) => void;
  nextSearchResult: () => number | null;
  prevSearchResult: () => number | null;
  getMediaUrl: (filename: string) => Promise<string | null>;
  openLightbox: (messageId: string) => void;
  closeLightbox: () => void;
  nextLightboxItem: () => void;
  prevLightboxItem: () => void;
  clearCache: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChatId: null,
  messages: [],
  metadata: null,
  currentUser: null,
  isLoading: false,
  parseProgress: null,
  resolvedMediaUrls: {},
  
  searchQuery: "",
  searchResults: [],
  searchCurrentIndex: -1,
  activeLightboxMessageId: null,

  loadAllChats: async () => {
    set({ isLoading: true });
    try {
      const chats = await dbService.getAllChats();
      // Sort by recently created or imported
      chats.sort((a, b) => b.createdAt - a.createdAt);
      set({ chats, isLoading: false });
    } catch (err) {
      console.error("Failed to load chats from DB", err);
      set({ isLoading: false });
    }
  },

  selectChat: async (chatId) => {
    // Revoke previous URLs to avoid memory leaks
    const { resolvedMediaUrls } = get();
    Object.values(resolvedMediaUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("Failed to revoke URL", e);
      }
    });

    set({
      selectedChatId: chatId,
      resolvedMediaUrls: {},
      searchQuery: "",
      searchResults: [],
      searchCurrentIndex: -1,
      isLoading: true,
    });

    try {
      const cached = await dbService.getChat(chatId);
      if (cached) {
        // Find most active sender to suggest as default currentUser "Me"
        const participants = cached.metadata.participants;
        let defaultUser: string | null = null;
        
        if (participants.length > 0) {
          // Find the sender with the highest message count
          const counts: Record<string, number> = {};
          cached.messages.forEach((msg) => {
            if (msg.sender && msg.sender !== "System") {
              counts[msg.sender] = (counts[msg.sender] || 0) + 1;
            }
          });
          
          let maxCount = -1;
          Object.entries(counts).forEach(([sender, count]) => {
            if (count > maxCount) {
              maxCount = count;
              defaultUser = sender;
            }
          });
        }

        // Apply "isMine" tags
        const messages = cached.messages.map((msg) => ({
          ...msg,
          isMine: defaultUser ? msg.sender === defaultUser : false,
        }));

        set({
          messages,
          metadata: cached.metadata,
          currentUser: defaultUser,
          isLoading: false,
        });
      } else {
        set({
          messages: [],
          metadata: null,
          currentUser: null,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error("Failed to select chat", err);
      set({ isLoading: false });
    }
  },

  deleteChat: async (chatId) => {
    try {
      await dbService.deleteChat(chatId);
      const { selectedChatId } = get();
      
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== chatId),
        selectedChatId: selectedChatId === chatId ? null : selectedChatId,
        messages: selectedChatId === chatId ? [] : state.messages,
        metadata: selectedChatId === chatId ? null : state.metadata,
      }));
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  },

  importChat: async (filename, chatText, mediaFiles) => {
    set({ isLoading: true, parseProgress: { phase: "reading", percentage: 0, currentLine: 0, totalLines: 0 } });
    
    try {
      // 1. Parse TXT Content
      const parsedMessages = await parseChatText(chatText, (progress) => {
        set({ parseProgress: progress });
      });

      if (parsedMessages.length === 0) {
        throw new Error("No messages could be parsed from the exported chat log.");
      }

      set({ parseProgress: { phase: "indexing", percentage: 95, currentLine: 0, totalLines: 0 } });

      // 2. Identify Unique Senders and Media counts
      const participantsSet = new Set<string>();
      let imageCount = 0;
      let videoCount = 0;
      let audioCount = 0;
      let docCount = 0;

      parsedMessages.forEach((msg) => {
        if (msg.sender && msg.sender !== "System") {
          participantsSet.add(msg.sender);
        }
        if (msg.type === "image") imageCount++;
        else if (msg.type === "video") videoCount++;
        else if (msg.type === "audio") audioCount++;
        else if (msg.type === "document") docCount++;
      });

      const startDate = parsedMessages.length > 0 
        ? new Date(parsedMessages[0].timestamp).toLocaleDateString()
        : "N/A";
      const endDate = parsedMessages.length > 0
        ? new Date(parsedMessages[parsedMessages.length - 1].timestamp).toLocaleDateString()
        : "N/A";

      const chatName = filename.replace(/\.zip$/i, "").replace(/\.txt$/i, "");
      const chatId = `chat-${Date.now()}`;

      const metadata: ChatMetadata = {
        chatName,
        totalMessages: parsedMessages.length,
        startDate,
        endDate,
        participants: Array.from(participantsSet),
        mediaCount: {
          images: imageCount,
          videos: videoCount,
          audio: audioCount,
          documents: docCount,
        },
      };

      const cachedChat: CachedChat = {
        id: chatId,
        metadata,
        messages: parsedMessages,
        createdAt: Date.now(),
      };

      // 3. Save Chat Structure
      await dbService.saveChat(cachedChat);

      // 4. Save media files to IndexedDB
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          // Extract file extension to get MIME type
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          let mimeType = "application/octet-stream";
          if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
            mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
          } else if (["mp4", "mov", "webm"].includes(ext)) {
            mimeType = `video/${ext === "mov" ? "quicktime" : ext}`;
          } else if (["opus", "mp3", "m4a", "wav", "ogg"].includes(ext)) {
            mimeType = `audio/${ext === "opus" ? "ogg" : ext === "m4a" ? "mp4" : ext}`;
          } else if (ext === "pdf") {
            mimeType = "application/pdf";
          }
          
          await dbService.saveMedia(chatId, file.name, file.blob, mimeType);
        }
      }

      // 5. Update State
      set((state) => ({
        chats: [cachedChat, ...state.chats],
        parseProgress: { phase: "complete", percentage: 100, currentLine: 0, totalLines: 0 },
        isLoading: false,
      }));

      // 6. Select Chat automatically
      await get().selectChat(chatId);
    } catch (err) {
      console.error("Parsing and importing failed", err);
      set({ isLoading: false, parseProgress: null });
      throw err;
    }
  },

  setCurrentUser: (user) => {
    const { messages } = get();
    const updatedMessages = messages.map((msg) => ({
      ...msg,
      isMine: msg.sender === user,
    }));
    set({ currentUser: user, messages: updatedMessages });
  },

  setSearchQuery: (query) => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      set({ searchQuery: "", searchResults: [], searchCurrentIndex: -1 });
      return;
    }

    const { messages } = get();
    const results: number[] = [];

    // Fast text search
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (
        msg.type !== "system" &&
        (msg.content.toLowerCase().includes(cleanQuery) ||
         msg.sender.toLowerCase().includes(cleanQuery))
      ) {
        results.push(i);
      }
    }

    set({
      searchQuery: query,
      searchResults: results,
      searchCurrentIndex: results.length > 0 ? 0 : -1,
    });
  },

  nextSearchResult: () => {
    const { searchResults, searchCurrentIndex } = get();
    if (searchResults.length === 0) return null;
    
    const nextIdx = (searchCurrentIndex + 1) % searchResults.length;
    set({ searchCurrentIndex: nextIdx });
    return searchResults[nextIdx];
  },

  prevSearchResult: () => {
    const { searchResults, searchCurrentIndex } = get();
    if (searchResults.length === 0) return null;

    const prevIdx =
      searchCurrentIndex - 1 < 0
        ? searchResults.length - 1
        : searchCurrentIndex - 1;
        
    set({ searchCurrentIndex: prevIdx });
    return searchResults[prevIdx];
  },

  getMediaUrl: async (filename) => {
    const { selectedChatId, resolvedMediaUrls } = get();
    if (!selectedChatId) return null;

    const cacheKey = `${selectedChatId}|${filename.toLowerCase()}`;
    if (resolvedMediaUrls[cacheKey]) {
      return resolvedMediaUrls[cacheKey];
    }

    try {
      const blob = await dbService.getMedia(selectedChatId, filename);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        set((state) => ({
          resolvedMediaUrls: {
            ...state.resolvedMediaUrls,
            [cacheKey]: objectUrl,
          },
        }));
        return objectUrl;
      }
    } catch (err) {
      console.error("Failed to load media Blob for URL", err);
    }
    return null;
  },

  openLightbox: (messageId) => set({ activeLightboxMessageId: messageId }),
  closeLightbox: () => set({ activeLightboxMessageId: null }),
  
  nextLightboxItem: () => {
    const { messages, activeLightboxMessageId } = get();
    if (!activeLightboxMessageId) return;
    const mediaMessages = messages.filter((m) => m.type === "image" || m.type === "video");
    const idx = mediaMessages.findIndex((m) => m.id === activeLightboxMessageId);
    if (idx !== -1 && idx < mediaMessages.length - 1) {
      set({ activeLightboxMessageId: mediaMessages[idx + 1].id });
    }
  },

  prevLightboxItem: () => {
    const { messages, activeLightboxMessageId } = get();
    if (!activeLightboxMessageId) return;
    const mediaMessages = messages.filter((m) => m.type === "image" || m.type === "video");
    const idx = mediaMessages.findIndex((m) => m.id === activeLightboxMessageId);
    if (idx > 0) {
      set({ activeLightboxMessageId: mediaMessages[idx - 1].id });
    }
  },

  clearCache: () => {
    const { resolvedMediaUrls } = get();
    Object.values(resolvedMediaUrls).forEach((url) => URL.revokeObjectURL(url));
    set({ resolvedMediaUrls: {} });
  },
}));
export default useChatStore;
