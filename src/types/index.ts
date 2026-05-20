export type MessageType =
  | "text"
  | "audio"
  | "image"
  | "video"
  | "document"
  | "system";

export interface ChatMessage {
  id: string;
  sender: string;
  timestamp: number; // Unix timestamp in milliseconds
  type: MessageType;
  content: string;
  mediaPath?: string; // Original filename from the log
  mediaUrl?: string; // Generated local object Blob URL
  mediaSize?: number; // File size in bytes
  duration?: number; // Duration of audio in seconds
  isMine: boolean;
}

export interface ChatMetadata {
  chatName: string;
  totalMessages: number;
  startDate: string;
  endDate: string;
  participants: string[];
  mediaCount: {
    images: number;
    videos: number;
    audio: number;
    documents: number;
  };
}

export interface CachedChat {
  id: string; // Typically the filename or timestamp hash
  metadata: ChatMetadata;
  messages: ChatMessage[];
  createdAt: number;
}

export interface CachedMedia {
  chatId: string;
  filename: string;
  blob: Blob;
  mimeType: string;
}
