import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/services/audioManager";
import { useChatStore } from "../stores/chatStore";

export function useActiveAudio(messageId: string, filename: string) {
  const getMediaUrl = useChatStore((state) => state.getMediaUrl);
  const playRequestRef = useRef(0);
  const audioSnapshot = useSyncExternalStore(
    (listener) => audioManager.subscribe(listener),
    () => audioManager.getActiveMessageId(),
    () => null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  const isCurrentActive = audioSnapshot === messageId;

  // Initialize status on mount/active check
  useEffect(() => {
    if (isCurrentActive) {
      setIsPlaying(audioManager.isPlaying());
      setCurrentTime(audioManager.getCurrentTime());
      setDuration(audioManager.getDuration() || 0);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isCurrentActive]);

  const handlePlay = async () => {
    const playRequestId = ++playRequestRef.current;

    try {
      const url = await getMediaUrl(filename);
      if (!url || playRequestId !== playRequestRef.current) return false;

      await audioManager.play(
        messageId,
        url,
        (time: number) => {
          setCurrentTime(time);
          if (duration === 0) {
            setDuration(audioManager.getDuration());
          }
        },
        () => {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      );

      if (playRequestId !== playRequestRef.current) return false;

      setDuration(audioManager.getDuration() || 0);
      setIsLoaded(true);
      setIsPlaying(true);
      return true;
    } catch (err) {
      console.error("Failed to play voice note", err);
      setIsPlaying(false);
      return false;
    }
  };

  const handlePause = () => {
    playRequestRef.current++;
    audioManager.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isCurrentActive) {
      if (isPlaying) {
        handlePause();
      } else {
        audioManager.resume();
        setIsPlaying(true);
      }
    } else {
      handlePlay();
    }
  };

  const seek = (seconds: number) => {
    if (isCurrentActive) {
      audioManager.seek(seconds);
      setCurrentTime(seconds);
    }
  };

  const cycleSpeed = () => {
    let nextSpeed = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    setSpeed(nextSpeed);
    if (isCurrentActive) {
      audioManager.setSpeed(nextSpeed);
    }
  };

  return {
    isCurrentActive,
    isPlaying,
    currentTime,
    duration,
    speed,
    isLoaded,
    togglePlay,
    seek,
    cycleSpeed,
  };
}
