import { useEffect, useState } from "react";
import { audioManager } from "../services/audioManager";
import { useChatStore } from "../stores/chatStore";

export function useActiveAudio(messageId: string, filename: string) {
  const getMediaUrl = useChatStore((state) => state.getMediaUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  const isCurrentActive = audioManager.getActiveMessageId() === messageId;

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
    try {
      const url = await getMediaUrl(filename);
      if (!url) return;

      setIsPlaying(true);
      
      await audioManager.play(
        messageId,
        url,
        (time) => {
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

      setDuration(audioManager.getDuration() || 0);
      setIsLoaded(true);
    } catch (err) {
      console.error("Failed to play voice note", err);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
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
