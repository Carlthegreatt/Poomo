"use client";

import { Button } from "@/components/ui/button";

import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useTimer, type Phase } from "@/stores/timerStore";
import TaskPicker from "./TaskPicker";

const PHASE_CONFIG = {
  WORK: {
    label: "Focus",
    text: "text-phase-focus",
    filled: "bg-phase-focus hover:bg-phase-focus/85",
    pillSelected: "bg-phase-focus text-white",
    shadowColor: "var(--phase-focus)",
  },
  BREAK_SHORT: {
    label: "Short Break",
    text: "text-phase-short",
    filled: "bg-phase-short hover:bg-phase-short/85",
    pillSelected: "bg-phase-short text-white",
    shadowColor: "var(--phase-short)",
  },
  BREAK_LONG: {
    label: "Long Break",
    text: "text-phase-long",
    filled: "bg-phase-long hover:bg-phase-long/85",
    pillSelected: "bg-phase-long text-white",
    shadowColor: "var(--phase-long)",
  },
} as const;

export default function Timer() {
  const phase = useTimer((s) => s.phase);
  const isRunning = useTimer((s) => s.isRunning);
  const remainingMs = useTimer((s) => s.remainingMs);
  const start = useTimer((s) => s.start);
  const pause = useTimer((s) => s.pause);
  const resume = useTimer((s) => s.resume);
  const setPhasePreview = useTimer((s) => s.setPhasePreview);
  const bellVolume = useTimer((s) => s.bellVolume);

  const audioContextRef = useRef<AudioContext | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  const cardControls = useAnimationControls();

  const [selectedPhase, setSelectedPhase] =
    useState<Exclude<Phase, "IDLE">>("WORK");

  const activePhase: Exclude<Phase, "IDLE"> =
    phase !== "IDLE" ? (phase as Exclude<Phase, "IDLE">) : selectedPhase;

  useEffect(() => {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      try {
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.warn("Could not create AudioContext:", error);
      }
    }

    const audio = new Audio("/sounds/Bell.mp3");
    audio.volume = Math.min(1, Math.max(0, bellVolume));
    audio.preload = "auto";
    bellAudioRef.current = audio;

    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bellAudioRef.current) {
      bellAudioRef.current.volume = Math.min(1, Math.max(0, bellVolume));
    }
  }, [bellVolume]);

  const initializeAudioOnUserGesture = () => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };

  useEffect(() => {
    const unsub = useTimer.subscribe((state, prevState) => {
      if (
        prevState.phase !== state.phase &&
        prevState.isRunning &&
        !state.isRunning
      ) {
        cardControls.start({
          scale: [1, 1.03, 1],
          transition: { duration: 0.4, ease: "easeInOut" },
        });
      }
    });
    return () => {
      unsub();
    };
  }, [cardControls]);

  useEffect(() => {
    let worker: Worker | null = null;
    let intervalId: number | null = null;
    if (typeof window != "undefined" && "Worker" in window) {
      try {
        worker = new Worker("/workers/timer.worker.js");
        worker.postMessage({ cmd: "start", ms: 250 });
        worker.onmessage = (e) => {
          if (e.data?.type === "tick") {
            useTimer.getState().tick(e.data.now);
          }
        };
      } catch {
        worker = null;
      }
    }

    if (!worker) {
      intervalId = window.setInterval(() => {
        useTimer.getState().tick();
      }, 500);
    }

    return () => {
      if (worker) {
        worker.postMessage({ cmd: "stop" });
        worker.terminate();
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Keep selected button in sync with current phase when phase changes (e.g., auto-advance or preview)
  useEffect(() => {
    if (phase !== "IDLE") {
      setSelectedPhase(phase as Exclude<Phase, "IDLE">);
    }
  }, [phase]);

  // Set initial display to default phase on mount if idle
  useEffect(() => {
    if (phase === "IDLE" && remainingMs === 0) {
      setPhasePreview("WORK");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = Math.floor(remainingMs / 60000)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor((remainingMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const getPhaseButtonClass = (type: Exclude<Phase, "IDLE">) => {
    const isSelected = isRunning ? phase === type : selectedPhase === type;
    if (!isSelected) return "";
    return `${PHASE_CONFIG[type].pillSelected} shadow-none translate-x-[3px] translate-y-[3px]`;
  };

  return (
    <main className="w-full">
      <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 justify-center">
          {(["WORK", "BREAK_SHORT", "BREAK_LONG"] as const).map((type) => (
            <motion.div
              key={type}
              whileHover={!isRunning ? { y: -2 } : undefined}
              whileTap={!isRunning ? { scale: 0.95 } : undefined}
            >
              <Button
                variant="outline"
                className={`rounded-full text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 ${getPhaseButtonClass(type)}`}
                disabled={isRunning}
                onClick={() => {
                  setSelectedPhase(type);
                  if (!isRunning) setPhasePreview(type);
                }}
              >
                {PHASE_CONFIG[type].label}
              </Button>
            </motion.div>
          ))}
        </div>
        <TaskPicker />
        <motion.div
          animate={cardControls}
          className="flex flex-col items-center border-2 border-border bg-white w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-3xl py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-12 gap-6 sm:gap-8 transition-[box-shadow,color] duration-300"
          style={{ boxShadow: `6px 6px 0 ${PHASE_CONFIG[activePhase].shadowColor}` }}
        >
          <div className={`font-bold text-6xl sm:text-7xl lg:text-8xl xl:text-8xl 2xl:text-9xl ${PHASE_CONFIG[activePhase].text} text-center leading-none transition-colors`}>
            {mm}:{ss}
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="filled"
              className={`w-full sm:w-auto text-base lg:text-lg xl:text-xl h-11 sm:h-12 lg:h-12 px-6 sm:px-8 lg:px-10 ${PHASE_CONFIG[activePhase].filled} text-white`}
              onClick={() => {
                initializeAudioOnUserGesture();

                if (isRunning) {
                  pause();
                } else {
                  if (remainingMs > 0 && phase !== "IDLE") {
                    resume();
                  } else {
                    start(selectedPhase);
                  }
                }
              }}
            >
              {isRunning ? "Pause" : "Start"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
