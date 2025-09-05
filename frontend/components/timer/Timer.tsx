"use client";

import { Button } from "../ui/button";

import React, { useEffect, useState } from "react";
import { useTimer, Phase } from "./useTimer";
import { toast, Toaster } from "sonner";

export default function Timer() {
  const phase = useTimer((s) => s.phase);
  const isRunning = useTimer((s) => s.isRunning);
  const remainingMs = useTimer((s) => s.remainingMs);
  const start = useTimer((s) => s.start);
  const pause = useTimer((s) => s.pause);
  const resume = useTimer((s) => s.resume);
  const setPhasePreview = useTimer((s) => s.setPhasePreview);

  const bgClass =
    phase === "BREAK_SHORT"
      ? "bg-emerald-50"
      : phase === "BREAK_LONG"
      ? "bg-sky-50"
      : phase === "WORK"
      ? "bg-white"
      : "bg-white";

  const textClass =
    phase === "BREAK_SHORT"
      ? "Short Break"
      : phase === "BREAK_LONG"
      ? "Long Break"
      : phase === "WORK";

  const [selectedPhase, setSelectedPhase] =
    useState<Exclude<Phase, "IDLE">>("WORK");

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
    switch (type) {
      case "WORK":
        return "bg-red-100 border border-neutral-300";
      case "BREAK_SHORT":
        return "bg-emerald-100 border border-emerald-200";
      case "BREAK_LONG":
        return "bg-sky-100 border border-sky-200";
    }
  };

  return (
    <main className="w-full">
      <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10 landscape-compact">
        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 justify-center">
          <Button
            variant={"outline"}
            className={`cursor-pointer rounded-full text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 ${getPhaseButtonClass(
              "WORK"
            )}`}
            disabled={isRunning}
            onClick={() => {
              setSelectedPhase("WORK");
              if (!isRunning) setPhasePreview("WORK");
            }}
          >
            Focus
          </Button>
          <Button
            variant={"outline"}
            className={`cursor-pointer rounded-full text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 ${getPhaseButtonClass(
              "BREAK_SHORT"
            )}`}
            disabled={isRunning}
            onClick={() => {
              setSelectedPhase("BREAK_SHORT");
              if (!isRunning) setPhasePreview("BREAK_SHORT");
            }}
          >
            Short Break
          </Button>
          <Button
            variant={"outline"}
            className={`cursor-pointer rounded-full text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 ${getPhaseButtonClass(
              "BREAK_LONG"
            )}`}
            disabled={isRunning}
            onClick={() => {
              setSelectedPhase("BREAK_LONG");
              if (!isRunning) setPhasePreview("BREAK_LONG");
            }}
          >
            Long Break
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center shadow-2xl bg-neutral-100 w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-2xl sm:rounded-3xl lg:rounded-4xl p-4 sm:p-6 lg:p-8">
          <div className="flex-1 flex items-center justify-center">
            <div className="font-bold text-7xl sm:text-7xl lg:text-9xl xl:text-9xl 2xl:text-9xl text-neutral-800 text-center text-responsive">
              {mm}:{ss}
            </div>
          </div>
          <div className="flex items-center justify-center pb-4 sm:pb-6 lg:pb-8">
            <Button
              className="cursor-pointer text-sm sm:text-base lg:text-lg xl:text-xl h-10 sm:h-12 lg:h-14 px-6 sm:px-8 lg:px-10 bg-neutral-800 hover:bg-neutral-700"
              onClick={() => {
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
              {isRunning
                ? "Pause"
                : remainingMs > 0 && phase !== "IDLE"
                ? "Start"
                : "Start"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
