import { CachedChat } from "../types";

const DB_NAME = "ChatVaultDB";
const DB_VERSION = 1;

class ChatVaultDatabase {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB failed to open");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Store for parsed chat records
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats", { keyPath: "id" });
        }

        // Store for media files (as binary Blobs)
        if (!db.objectStoreNames.contains("media")) {
          db.createObjectStore("media", { keyPath: "id" });
        }
      };
    });
  }

  // --- Chats Operations ---

  public async saveChat(chat: CachedChat): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("chats", "readwrite");
        const store = transaction.objectStore("chats");
        const request = store.put(chat);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB saveChat failed, falling back to in-memory only", err);
    }
  }

  public async getChat(chatId: string): Promise<CachedChat | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("chats", "readonly");
        const store = transaction.objectStore("chats");
        const request = store.get(chatId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB getChat failed", err);
      return null;
    }
  }

  public async getAllChats(): Promise<CachedChat[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("chats", "readonly");
        const store = transaction.objectStore("chats");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB getAllChats failed", err);
      return [];
    }
  }

  public async deleteChat(chatId: string): Promise<void> {
    try {
      const db = await this.getDB();
      
      // Delete chat record
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("chats", "readwrite");
        const store = transaction.objectStore("chats");
        const request = store.delete(chatId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Delete associated media records
      const mediaKeys = await this.getMediaKeysForChat(chatId);
      if (mediaKeys.length > 0) {
        const transaction = db.transaction("media", "readwrite");
        const store = transaction.objectStore("media");
        mediaKeys.forEach(key => store.delete(key));
      }
    } catch (err) {
      console.warn("IndexedDB deleteChat failed", err);
    }
  }

  // --- Media Operations ---

  public async saveMedia(
    chatId: string,
    filename: string,
    blob: Blob,
    mimeType: string
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const id = `${chatId}|${filename.toLowerCase()}`;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("media", "readwrite");
        const store = transaction.objectStore("media");
        const request = store.put({ id, chatId, filename: filename.toLowerCase(), blob, mimeType });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB saveMedia failed", err);
    }
  }

  public async getMedia(chatId: string, filename: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      const id = `${chatId}|${filename.toLowerCase()}`;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("media", "readonly");
        const store = transaction.objectStore("media");
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result?.blob || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB getMedia failed", err);
      return null;
    }
  }

  private async getMediaKeysForChat(chatId: string): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("media", "readonly");
      const store = transaction.objectStore("media");
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const allKeys = (request.result || []) as string[];
        const filteredKeys = allKeys.filter(key => key.startsWith(`${chatId}|`));
        resolve(filteredKeys);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(["chats", "media"], "readwrite");
        transaction.objectStore("chats").clear();
        transaction.objectStore("media").clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      console.warn("IndexedDB clearAll failed", err);
    }
  }
}

export const dbService = new ChatVaultDatabase();
export default dbService;
