import dayjs from "dayjs";
import { ChatMessage, MessageType } from "../types";

export interface ParserProgress {
  phase: "reading" | "parsing" | "indexing" | "complete";
  percentage: number;
  currentLine: number;
  totalLines: number;
}

// Robust patterns for WhatsApp export header styles
const PATTERNS = {
  // iOS style: [12/04/26, 8:42:15 PM] John: Hello
  // Captures date+time inside brackets, sender (non-bracket, non-colon), message content
  iOS: /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\]\s+([^:]+):\s+(.+)$/i,
  
  // iOS system message: [12/04/26, 8:42:15 PM] John joined the group
  iOSSystem: /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)\]\s+(.+)$/i,

  // Android style: 12/04/26, 8:42 PM - John: Hello
  // Captures date+time, sender, message content
  Android: /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*([^:]+):\s+(.+)$/i,

  // Android system message: 12/04/26, 8:42 PM - Messages and calls are end-to-end encrypted
  AndroidSystem: /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(.+)$/i,
};

// Media identification patterns
const MEDIA_PATTERNS = [
  // iOS attach style: <attached: image.jpg>
  /\<attached:\s*([^\>]+)\>/i,
  // Android attach style: image.jpg (file attached)
  /^([^\(\n\r]+)\s*\(file attached\)/i,
  // Alternative attachment styles
  /\<attachment:\s*([^\>]+)\>/i,
];

// Map filename extension to standard MessageType
function getMessageType(filename: string): MessageType {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return "text";

  const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
  const videoExts = ["mp4", "mov", "3gp", "avi", "mkv", "webm"];
  const audioExts = ["opus", "mp3", "m4a", "wav", "ogg", "aac"];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "document";
}

// Flexible date string parser
function parseDateTime(dateStr: string, timeStr: string): number {
  // Convert standard styles to ISO friendly
  // dateStr could be 12/04/26 or 2026-04-12
  // Clean up AM/PM spaces
  const cleanTime = timeStr.replace(/\s+/g, " ").trim();
  
  // Format dayjs parses: "YYYY-MM-DD HH:mm:ss" or standard locales
  // Let's try standard JS parser first via dayjs
  let parsed = dayjs(`${dateStr} ${cleanTime}`);
  if (parsed.isValid()) {
    return parsed.valueOf();
  }

  // Fallback for custom layouts: e.g. YY/MM/DD or DD/MM/YY
  // We'll clean slashes and try to format
  const parts = dateStr.split(/[-/.]/);
  if (parts.length === 3) {
    let year = parseInt(parts[2]);
    let month = parseInt(parts[1]) - 1;
    let day = parseInt(parts[0]);

    // Check if parts[0] is year (e.g. 2026/04/12)
    if (parts[0].length === 4) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
    } else if (year < 100) {
      // Handle 2-digit years
      year += year < 70 ? 2000 : 1900;
    }

    // Try parsing time
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
      const ampm = timeMatch[4];

      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
        if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
      }

      const nativeDate = new Date(year, month, day, hours, minutes, seconds);
      return nativeDate.getTime();
    }
  }

  return Date.now(); // Safe fallback
}

/**
 * High-performance line-by-line parsing engine.
 * Processes massive text files asynchronously in chunks to prevent locking the browser event loop.
 */
export async function parseChatText(
  text: string,
  onProgress?: (progress: ParserProgress) => void
): Promise<ChatMessage[]> {
  const lines = text.split(/\r?\n/);
  const totalLines = lines.length;
  const messages: ChatMessage[] = [];
  
  let currentMessage: ChatMessage | null = null;
  const chunkSize = 4000; // Parse 4000 lines at a time to prevent UI lag

  onProgress?.({ phase: "parsing", percentage: 0, currentLine: 0, totalLines });

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i];
    const normalizedLine = line.replace(/^\uFEFF/, "");
    
    // Periodically yield control to the browser
    if (i > 0 && i % chunkSize === 0) {
      onProgress?.({
        phase: "parsing",
        percentage: Math.min(100, Math.round((i / totalLines) * 100)),
        currentLine: i,
        totalLines,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Check for message headers
    let match = normalizedLine.match(PATTERNS.iOS);
    let matchediOS = true;

    if (!match) {
      match = normalizedLine.match(PATTERNS.Android);
      matchediOS = false;
    }

    if (match) {
      // Commit previous message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const dateStr = match[1];
      const timeStr = match[2];
      const sender = match[3].trim();
      let content = match[4].trim();

      const timestamp = parseDateTime(dateStr, timeStr);
      let type: MessageType = "text";
      let mediaPath: string | undefined;

      // Scan for media files in the content
      for (const pattern of MEDIA_PATTERNS) {
        const mediaMatch = content.match(pattern);
        if (mediaMatch) {
          mediaPath = mediaMatch[1].trim();
          type = getMessageType(mediaPath);
          content = mediaPath; // Standardize content to show the filename
          break;
        }
      }

      // Detect common deleted text forms
      if (
        content === "This message was deleted" ||
        content === "You deleted this message" ||
        content.includes("omitted")
      ) {
        type = "system";
      }

      currentMessage = {
        id: `msg-${messages.length}-${timestamp}-${Math.random().toString(36).substr(2, 5)}`,
        sender,
        timestamp,
        type,
        content,
        mediaPath,
        isMine: false, // Will be computed in the state store based on current user configuration
      };
      
      continue;
    }

    // Check for system messages (status updates, calls, encryption announcements)
    let sysMatch = normalizedLine.match(PATTERNS.iOSSystem);
    if (!sysMatch) {
      sysMatch = normalizedLine.match(PATTERNS.AndroidSystem);
    }

    if (sysMatch) {
      // Commit previous message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const dateStr = sysMatch[1];
      const timeStr = sysMatch[2];
      const content = sysMatch[3].trim();
      const timestamp = parseDateTime(dateStr, timeStr);

      currentMessage = {
        id: `msg-${messages.length}-${timestamp}-sys`,
        sender: "System",
        timestamp,
        type: "system",
        content,
        isMine: false,
      };
      
      continue;
    }

    // If it doesn't match any patterns, it's a multi-line continuation of the current message
    if (currentMessage) {
      // Keep adding to current message if it's text or empty line
      if (currentMessage.type === "text") {
        currentMessage.content += "\n" + line;
      } else {
        // If the message was media, a continuation might indicate text comments or captions
        // We will append it but preserve type as media (this is typical for image captions)
        currentMessage.content += "\n" + line;
      }
    }
  }

  // Push the final message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  onProgress?.({ phase: "complete", percentage: 100, currentLine: totalLines, totalLines });

  return messages;
}
