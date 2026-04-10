"use client";

import { useEffect, useRef, useCallback } from "react";
import { initTimerClientSync, useTimer } from "@/stores/timerStore";

const PHASE_LABELS: Record<string, string> = {
  WORK: "Focus",
  BREAK_SHORT: "Short Break",
  BREAK_LONG: "Long Break",
};

function useTimerBell() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      try {
        audioContextRef.current = new AudioContext();
      } catch {
        /* ignore */
      }
    }

    const audio = new Audio("/sounds/Bell.mp3");
    audio.preload = "auto";
    bellAudioRef.current = audio;

    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return useCallback((volume: number) => {
    const el = bellAudioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, volume));
    el.currentTime = 0;
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    el.play().catch(() => {
      try {
        const fallback = new Audio("/sounds/Bell.mp3");
        fallback.volume = Math.min(1, Math.max(0, volume));
        fallback.play().catch(() => {});
      } catch {
        /* ignore */
      }
    });
  }, []);
}

export default function TimerCompletionBridge() {
  const playBell = useTimerBell();

  useEffect(() => {
    initTimerClientSync();
  }, []);

  useEffect(() => {
    const unsub = useTimer.subscribe((state, prevState) => {
      if (
        prevState.phase !== state.phase &&
        prevState.isRunning &&
        !state.isRunning
      ) {
        const finishedPhase = prevState.phase;
        const vol = state.bellVolume;
        playBell(vol);

        if ("Notification" in window && Notification.permission === "granted") {
          const label =
            PHASE_LABELS[finishedPhase] ?? String(finishedPhase);
          new Notification(`${label} finished!`);
        }
      }
    });
    return () => {
      unsub();
    };
  }, [playBell]);

  return null;
}
