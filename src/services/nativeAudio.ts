// Lightweight runtime bridge to a native Capacitor audio plugin.
// This file does NOT add the native plugin—install a Capacitor audio plugin
// on the Android project (example: a community media/native-audio plugin)
// and ensure it exposes methods like `play`, `pause`, `stop`, `seek`,
// `getCurrentTime`, `getDuration`, and optionally `addListener('finished', ...)`.

type NativeImpl = any;

function getImpl(): NativeImpl | null {
  const win = typeof window !== "undefined" ? (window as any) : null;
  if (!win) return null;
  // Capacitor exposes plugins at window.Capacitor.Plugins or global Plugins
  const plugins = win.Capacitor?.Plugins || win.Plugins || (win as any);
  // Try common names
  return plugins?.NativeAudio || plugins?.Media || plugins?.MediaPlayer || plugins?.CapacitorNativeAudio || null;
}

export const nativeAudio = {
  isAvailable(): boolean {
    return !!getImpl();
  },

  async play(path: string) {
    const impl = getImpl();
    if (!impl) throw new Error("Native audio plugin not available");
    if (impl.play) return impl.play({ path });
    if (impl.start) return impl.start(path);
    throw new Error("Native audio plugin has no play/start method");
  },

  async pause() {
    const impl = getImpl();
    if (!impl) return;
    if (impl.pause) return impl.pause();
    if (impl.stop) return impl.stop();
  },

  async resume() {
    const impl = getImpl();
    if (!impl) return;
    if (impl.resume) return impl.resume();
    if (impl.play) return impl.play();
  },

  async stop() {
    const impl = getImpl();
    if (!impl) return;
    if (impl.stop) return impl.stop();
    if (impl.pause) return impl.pause();
  },

  async seek(seconds: number) {
    const impl = getImpl();
    if (!impl) return;
    if (impl.seek) return impl.seek({ position: seconds });
    if (impl.setPosition) return impl.setPosition(seconds);
  },

  async getCurrentTime(): Promise<number> {
    const impl = getImpl();
    if (!impl) return 0;
    if (impl.getCurrentTime) return impl.getCurrentTime();
    if (impl.getPosition) return impl.getPosition();
    return 0;
  },

  async getDuration(): Promise<number> {
    const impl = getImpl();
    if (!impl) return 0;
    if (impl.getDuration) return impl.getDuration();
    return 0;
  },

  // Optional: attach native event listeners if plugin supports it
  addListener(eventName: string, cb: (...args: any[]) => void) {
    const impl = getImpl();
    if (!impl || !impl.addListener) return { remove: () => {} };
    return impl.addListener(eventName, cb);
  },
};

export default nativeAudio;
