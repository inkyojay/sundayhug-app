/**
 * Audio Player Hook
 */
import { useState, useRef, useCallback } from "react";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioUrl: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setCurrentPlayingId(messageId);
    setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    };
    audio.play().catch(() => {
      setIsPlaying(false);
      setCurrentPlayingId(null);
    });
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
  }, []);

  return { isPlaying, currentPlayingId, play, stop };
}
