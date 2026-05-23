import { nativeAudio } from "@/services/nativeAudio";

export class AudioManager {
  private static instance: AudioManager | null = null;
  private audio: HTMLAudioElement | null = null;
  private tempObjectUrl: string | null = null;
  private activeMessageId: string | null = null;
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private playbackRequestId = 0;
  private nativePollTimer: number | null = null;
  private listeners = new Set<() => void>();
  private audioContext: AudioContext | null = null;
  private webAudioSource: AudioBufferSourceNode | null = null;
  private webAudioBuffer: AudioBuffer | null = null;
  private webAudioStartTime = 0;
  private webAudioOffset = 0;
  private webAudioPlaying = false;
  private webAudioInterval: number | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.audio = this.createAudioElement();
    }
  }

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  private createAudioElement(): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    this.bindAudioListeners(audio);
    return audio;
  }

  private bindAudioListeners(audio: HTMLAudioElement) {
    audio.addEventListener("timeupdate", this.handleTimeUpdate);
    audio.addEventListener("ended", this.handleEndedEvent);
    audio.addEventListener("pause", this.handlePauseEvent);
    audio.addEventListener("play", this.handlePlayEvent);
  }

  private unbindAudioListeners(audio: HTMLAudioElement) {
    audio.removeEventListener("timeupdate", this.handleTimeUpdate);
    audio.removeEventListener("ended", this.handleEndedEvent);
    audio.removeEventListener("pause", this.handlePauseEvent);
    audio.removeEventListener("play", this.handlePlayEvent);
  }

  private handleTimeUpdate = () => {
    const audio = this.audio;
    if (audio && this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(audio.currentTime);
    }
  };

  private handleEndedEvent = () => {
    const endedCallback = this.onEndedCallback;
    this.releaseAudioElement();
    this.clearPlaybackState();
    this.emitChange();

    if (endedCallback) {
      endedCallback();
    }
  };

  private handlePauseEvent = () => {
    this.emitChange();
  };

  private handlePlayEvent = () => {
    this.emitChange();
  };

  private emitChange() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn("AudioManager listener failed", err);
      }
    });
  }

  private clearPlaybackState() {
    this.activeMessageId = null;
    this.onTimeUpdateCallback = null;
    this.onEndedCallback = null;
  }

  private releaseAudioElement() {
    const audio = this.audio;
    if (!audio) return;

    try {
      audio.pause();
    } catch {
      // Ignore pause errors during cleanup.
    }

    this.unbindAudioListeners(audio);
    audio.removeAttribute("src");
    audio.src = "";
    audio.load();
    if (this.tempObjectUrl) {
      try {
        URL.revokeObjectURL(this.tempObjectUrl);
      } catch (e) {
        // ignore
      }
      this.tempObjectUrl = null;
    }
    this.audio = null;
    // stop any native polling
    if (this.nativePollTimer) {
      try {
        clearInterval(this.nativePollTimer);
      } catch {}
      this.nativePollTimer = null;
    }
    // clear WebAudio resources
    this.stopWebAudio();
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    if (typeof window === "undefined") return null;
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.audioContext = new Ctor();
      return this.audioContext;
    } catch {
      return null;
    }
  }

  private startWebAudioPlay(buffer: AudioBuffer, requestId: number) {
    const ac = this.ensureAudioContext();
    if (!ac) return;
    this.stopWebAudio();
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(ac.destination);
    const offset = this.webAudioOffset || 0;
    try {
      src.start(0, offset);
    } catch (e) {
      // start may throw if buffer empty or invalid
      console.error("webAudio start failed", e);
      return;
    }
    this.webAudioSource = src;
    this.webAudioBuffer = buffer;
    this.webAudioStartTime = ac.currentTime - offset;
    this.webAudioPlaying = true;

    src.onended = () => {
      // ensure this corresponds to current playback
      if (requestId !== this.playbackRequestId) return;
      this.webAudioPlaying = false;
      this.webAudioOffset = 0;
      if (this.onEndedCallback) this.onEndedCallback();
      this.clearPlaybackState();
      this.emitChange();
    };

    // time update loop
    this.webAudioInterval = window.setInterval(() => {
      try {
        if (!this.webAudioPlaying || !this.webAudioBuffer) return;
        const current = ac.currentTime - this.webAudioStartTime;
        if (this.onTimeUpdateCallback) this.onTimeUpdateCallback(current);
      } catch {
        // ignore
      }
    }, 250) as unknown as number;
  }

  private stopWebAudio() {
    try {
      if (this.webAudioSource) {
        try {
          this.webAudioSource.onended = null;
        } catch {}
        try {
          this.webAudioSource.stop();
        } catch {}
        this.webAudioSource.disconnect();
        this.webAudioSource = null;
      }
    } catch {}
    this.webAudioBuffer = null;
    this.webAudioPlaying = false;
    this.webAudioOffset = 0;
    if (this.webAudioInterval) {
      try {
        clearInterval(this.webAudioInterval);
      } catch {}
      this.webAudioInterval = null;
    }
  }

  private pauseWebAudio() {
    if (!this.webAudioPlaying) return;
    const ac = this.ensureAudioContext();
    if (!ac) return;
    try {
      // stop source and record offset
      if (this.webAudioSource) {
        this.webAudioSource.stop();
        this.webAudioSource.onended = null;
        this.webAudioSource.disconnect();
        this.webAudioSource = null;
      }
    } catch {}
    this.webAudioOffset = ac.currentTime - this.webAudioStartTime;
    this.webAudioPlaying = false;
    if (this.webAudioInterval) {
      try {
        clearInterval(this.webAudioInterval);
      } catch {}
      this.webAudioInterval = null;
    }
  }

  private resumeWebAudio(requestId: number) {
    const ac = this.ensureAudioContext();
    if (!ac || !this.webAudioBuffer) return;
    this.startWebAudioPlay(this.webAudioBuffer, requestId);
  }

  private seekWebAudio(seconds: number, requestId: number) {
    const ac = this.ensureAudioContext();
    if (!ac || !this.webAudioBuffer) return;
    this.webAudioOffset = Math.max(0, Math.min(seconds, this.webAudioBuffer.duration || 0));
    this.startWebAudioPlay(this.webAudioBuffer, requestId);
  }

  private ensureFreshAudioElement() {
    this.releaseAudioElement();
    this.audio = this.createAudioElement();
  }

  private async waitForReadyState(audio: HTMLAudioElement, requestId: number): Promise<void> {
    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("loadedmetadata", onReady);
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onReady);
        clearTimeout(timeoutId);
        resolve();
      };

      const onReady = () => finish();
      const timeoutId = setTimeout(finish, 1200);

      audio.addEventListener("loadedmetadata", onReady, { once: true });
      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("error", onReady, { once: true });

      if (requestId !== this.playbackRequestId) {
        finish();
      }
    });
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  public getActiveMessageId(): string | null {
    return this.activeMessageId;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async play(
    messageId: string,
    url: string,
    onTimeUpdate: (time: number) => void,
    onEnded: () => void
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const requestId = ++this.playbackRequestId;

    // If another audio is active and different, tell subscribers to teardown
    // their UI/waveform first, then create a fresh element. This avoids
    // destroying the audio element while WaveSurfer or other components are
    // still attached to it (which breaks playback in Android WebView).
    if (this.activeMessageId && this.activeMessageId !== messageId) {
      // mark no active id so subscribers know to cleanup
      this.activeMessageId = null;
      this.emitChange();

      // allow a short tick for React effects to run and destroy WaveSurfer
      await new Promise((r) => setTimeout(r, 30));
    }

    // Always start from a fresh audio element so Android WebView and Chromium do not
    // retain stale decoder/source state when switching tracks rapidly.
    // If a native plugin is available and we're on Android, prefer native playback.
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
    const useNative = isAndroid && nativeAudio.isAvailable();

    if (useNative) {
      // configure state for subscribers
      this.activeMessageId = messageId;
      this.onTimeUpdateCallback = onTimeUpdate;
      this.onEndedCallback = onEnded;
      this.emitChange();

      try {
        await nativeAudio.play(url);

        // start polling for progress
        try {
          this.nativePollTimer = window.setInterval(async () => {
            try {
              const t = await nativeAudio.getCurrentTime();
              if (this.onTimeUpdateCallback) this.onTimeUpdateCallback(t);
              const d = await nativeAudio.getDuration();
              if (d && t >= d - 0.4) {
                // treat as ended
                if (this.onEndedCallback) this.onEndedCallback();
                this.stop();
              }
            } catch (e) {
              // ignore polling errors
            }
          }, 250) as unknown as number;
        } catch {}

        return;
      } catch (err) {
        console.warn("Native audio playback failed, falling back to HTMLAudio", err);
        // fall through to HTMLAudio fallback
      }
    }

    this.ensureFreshAudioElement();
    const audio = this.audio;
    if (!audio) return;

    this.activeMessageId = messageId;
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;
    this.emitChange();

    audio.src = url;
    audio.load();

    try {
      console.debug("AudioManager.play: preparing to play", { requestId, url, activeMessageId: this.activeMessageId });
      console.debug("AudioManager.play: canPlayType mp3/ogg/wav", {
        mp3: audio.canPlayType("audio/mpeg"),
        ogg: audio.canPlayType("audio/ogg"),
        wav: audio.canPlayType("audio/wav"),
      });
      await this.waitForReadyState(audio, requestId);
      if (requestId !== this.playbackRequestId) return;

      await audio.play();
      if (requestId !== this.playbackRequestId) {
        this.releaseAudioElement();
        return;
      }
    } catch (err) {
      console.error("AudioManager playback failed:", err);
      try {
        console.debug({
          url,
          currentSrc: audio.currentSrc,
          src: audio.src,
          readyState: audio.readyState,
        });
      } catch {}

      // If the browser reports NotSupportedError, try fetching the resource
      // and creating a Blob URL for playback as a fallback. This can help
      // when the original source lacks proper type metadata for WebView.
      const isNotSupported = (err as any)?.name === "NotSupportedError" || /NotSupportedError/i.test(String(err));
      if (isNotSupported) {
        try {
          const fetched = await fetch(url);
          // Read the body once as an ArrayBuffer, then create a Blob from it
          const arrayBuffer = await fetched.arrayBuffer();
          let type = fetched.headers.get("content-type") || "";
          if (type) type = type.split(";")[0];
          const blob = new Blob([arrayBuffer], { type: type || "audio/mpeg" });
          // Try blob URL first
          const objectUrl = URL.createObjectURL(blob);
          this.tempObjectUrl = objectUrl;
          audio.src = objectUrl;
          audio.load();
          try {
            await this.waitForReadyState(audio, requestId);
            if (requestId !== this.playbackRequestId) return;
            await audio.play();
            if (requestId !== this.playbackRequestId) {
              this.releaseAudioElement();
              return;
            }
            return;
          } catch (errBlobPlay) {
            console.warn("AudioManager blob URL play failed, trying WebAudio fallback", errBlobPlay);
            // fall through to WebAudio fallback below
          }

          // WebAudio fallback: decode and play via AudioContext using the same ArrayBuffer
          try {
            const ac = this.ensureAudioContext();
            if (ac) {
              const decoded = await ac.decodeAudioData(arrayBuffer.slice(0));
              // remember decoded buffer and start playing
              this.webAudioBuffer = decoded;
              this.webAudioOffset = 0;
              this.startWebAudioPlay(decoded, requestId);
              return;
            }
          } catch (errWebAudio) {
            console.error("AudioManager WebAudio fallback failed:", errWebAudio);
          }
          return;
        } catch (err2) {
          console.error("AudioManager fallback playback failed:", err2);
        }
      }
      if (requestId !== this.playbackRequestId) {
        return;
      }
      console.error("AudioManager playback failed:", err);
      this.stop();
    }
  }

  public pause(): void {
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
    const useNative = isAndroid && nativeAudio.isAvailable() && this.activeMessageId;
    if (useNative) {
      nativeAudio.pause().catch((err: any) => console.error("nativeAudio.pause failed", err));
      this.emitChange();
      return;
    }

    if (this.audio) {
      this.audio.pause();
      this.emitChange();
    }
  }

  public resume(): void {
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
    const useNative = isAndroid && nativeAudio.isAvailable() && this.activeMessageId;
    if (useNative) {
      nativeAudio.resume().catch((err: any) => console.error("nativeAudio.resume failed", err));
      this.emitChange();
      return;
    }

    if (this.audio && this.activeMessageId) {
      this.audio.play().catch((err) => {
        console.error("AudioManager resume failed:", err);
      });
      this.emitChange();
    }
  }

  public stop(): void {
    this.playbackRequestId++;
    // stop native playback if active
    try {
      if (nativeAudio.isAvailable()) {
        nativeAudio.stop().catch(() => {});
      }
    } catch {}

    this.releaseAudioElement();
    this.clearPlaybackState();
    this.emitChange();
  }

  public seek(seconds: number): void {
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
    const useNative = isAndroid && nativeAudio.isAvailable() && this.activeMessageId;
    if (useNative) {
      nativeAudio.seek(seconds).catch((err: any) => console.error("nativeAudio.seek failed", err));
      return;
    }

    if (this.audio) {
      this.audio.currentTime = seconds;
    }
  }

  public setSpeed(speed: number): void {
    if (this.audio) {
      this.audio.playbackRate = speed;
    }
    try {
      if (nativeAudio.isAvailable() && (nativeAudio as any).setSpeed) {
        (nativeAudio as any).setSpeed(speed).catch(() => {});
      }
    } catch {}
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
