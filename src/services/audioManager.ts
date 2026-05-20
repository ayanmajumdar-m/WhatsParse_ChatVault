import useChatStore from "../stores/chatStore";

export class AudioManager {
  private static instance: AudioManager | null = null;
  private audio: HTMLAudioElement | null = null;
  private activeMessageId: string | null = null;
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.setupEventListeners();
    }
  }

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener("timeupdate", () => {
      if (this.audio && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime);
      }
    });

    this.audio.addEventListener("ended", () => {
      this.handleEnded();
    });

    this.audio.addEventListener("pause", () => {
      // Sync state if audio was paused externally (e.g. bluetooth control, native player)
      this.syncIsPlaying(false);
    });

    this.audio.addEventListener("play", () => {
      this.syncIsPlaying(true);
    });
  }

  private syncIsPlaying(isPlaying: boolean) {
    // We update the active playback state if necessary (can trigger re-renders dynamically)
  }

  private handleEnded() {
    this.activeMessageId = null;
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  public getActiveMessageId(): string | null {
    return this.activeMessageId;
  }

  public async play(
    messageId: string,
    url: string,
    onTimeUpdate: (time: number) => void,
    onEnded: () => void
  ): Promise<void> {
    if (!this.audio) return;

    // If another audio is active, stop it first
    if (this.activeMessageId && this.activeMessageId !== messageId) {
      this.stop();
    }

    this.activeMessageId = messageId;
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;

    // If it's a new audio source, load it
    const currentSrc = this.audio.src;
    // Object URL might match or need full reload
    if (currentSrc !== url) {
      this.audio.src = url;
      this.audio.load();
    }

    try {
      await this.audio.play();
    } catch (err) {
      console.error("AudioManager playback failed:", err);
      this.handleEnded();
    }
  }

  public pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  public resume(): void {
    if (this.audio && this.activeMessageId) {
      this.audio.play().catch(err => {
        console.error("AudioManager resume failed:", err);
      });
    }
  }

  public stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.activeMessageId = null;
    this.onTimeUpdateCallback = null;
    this.onEndedCallback = null;
  }

  public seek(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = seconds;
    }
  }

  public setSpeed(speed: number): void {
    if (this.audio) {
      this.audio.playbackRate = speed;
    }
  }

  public getDuration(): number {
    return this.audio ? this.audio.duration || 0 : 0;
  }

  public getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  public isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }
}

export const audioManager = AudioManager.getInstance();
export default audioManager;
