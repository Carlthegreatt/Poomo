"use client";

import { Button } from "@/components/ui/button";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer, type Phase } from "@/stores/timerStore";
import TaskPicker from "./TaskPicker";

function isDocumentFullscreen(): boolean {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
  };
  return !!(
    document.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement
  );
}

function requestFullscreenEl(el: HTMLElement): Promise<void> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
  };
  if (el.requestFullscreen) return el.requestFullscreen();
  if (anyEl.webkitRequestFullscreen) {
    anyEl.webkitRequestFullscreen();
    return Promise.resolve();
  }
  if (anyEl.mozRequestFullScreen) {
    anyEl.mozRequestFullScreen();
    return Promise.resolve();
  }
  return Promise.reject(new Error("Fullscreen not supported"));
}

function exitFullscreenDoc(): Promise<void> {
  const d = document as Document & {
    webkitExitFullscreen?: () => void;
    webkitFullscreenElement?: Element | null;
    mozCancelFullScreen?: () => void;
    mozFullScreenElement?: Element | null;
  };
  if (document.fullscreenElement) {
    return document.exitFullscreen();
  }
  if (d.webkitFullscreenElement && d.webkitExitFullscreen) {
    d.webkitExitFullscreen();
    return Promise.resolve();
  }
  if (d.mozFullScreenElement && d.mozCancelFullScreen) {
    d.mozCancelFullScreen();
    return Promise.resolve();
  }
  return Promise.resolve();
}

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

/** Timer card width; phase pills + link-task band are sized separately (band matches combined pill width). */
const TIMER_COLUMN =
  "w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl min-w-0";

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
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const phasePillsRef = useRef<HTMLDivElement>(null);
  const [pillBandWidthPx, setPillBandWidthPx] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Keep selected button in sync with current phase when phase changes (e.g., auto-advance or preview)
  useEffect(() => {
    if (phase !== "IDLE") {
      setSelectedPhase(phase as Exclude<Phase, "IDLE">);
    }
  }, [phase]);

  useEffect(() => {
    const sync = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    document.addEventListener("mozfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      document.removeEventListener("mozfullscreenchange", sync);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenRef.current;
    if (!el) return;
    try {
      if (!isDocumentFullscreen()) {
        await requestFullscreenEl(el);
      } else {
        await exitFullscreenDoc();
      }
    } catch {
      /* user denied or unsupported */
    }
  }, []);

  // Set initial display to default phase on mount if idle
  useEffect(() => {
    if (phase === "IDLE" && remainingMs === 0) {
      setPhasePreview("WORK");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Single primitive dep so the hook’s dependency array length never changes (avoids dev/HMR mismatch warnings). */
  const pillBandMeasureKey = `${isFullscreen}:${selectedPhase}:${phase}`;

  useLayoutEffect(() => {
    if (isFullscreen) return;
    const el = phasePillsRef.current;
    if (!el) return;
    const sync = () => setPillBandWidthPx(el.getBoundingClientRect().width);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isFullscreen is encoded in pillBandMeasureKey
  }, [pillBandMeasureKey]);

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
      <div className="flex flex-col items-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10 w-full box-border">
        {!isFullscreen && (
          <div className="w-full flex justify-center min-w-0">
            <div
              ref={phasePillsRef}
              className="inline-flex max-w-full flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4"
            >
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
          </div>
        )}

        {/* Fullscreen API only includes this subtree: timer card + exit control (no phase pills, no link task) */}
        <div
          ref={fullscreenRef}
          className={cn(
            "w-full flex flex-col items-center",
            isFullscreen &&
              "min-h-[100dvh] justify-center bg-background p-4 sm:p-6 box-border",
          )}
        >
          <motion.div
            animate={cardControls}
            className={`relative flex flex-col items-stretch border-2 border-border bg-white ${TIMER_COLUMN} rounded-3xl py-10 sm:py-14 lg:py-16 px-6 sm:px-10 lg:px-12 gap-6 sm:gap-8 transition-[box-shadow,color] duration-300`}
            style={{
              boxShadow: `6px 6px 0 ${PHASE_CONFIG[activePhase].shadowColor}`,
            }}
          >
            {isFullscreen ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl shadow-[2px_2px_0_black] z-10"
                onClick={() => void toggleFullscreen()}
                aria-label="Exit fullscreen"
              >
                <Minimize2 className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl shadow-[2px_2px_0_black] z-10"
                onClick={() => void toggleFullscreen()}
                aria-label="Enter fullscreen"
              >
                <Maximize2 className="size-4" />
              </Button>
            )}
            <div
              className={`font-bold text-6xl sm:text-7xl lg:text-8xl xl:text-8xl 2xl:text-9xl ${PHASE_CONFIG[activePhase].text} text-center leading-none transition-colors px-10`}
            >
              {mm}:{ss}
            </div>
            <motion.div whileTap={{ scale: 0.95 }} className="flex justify-center">
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

        {!isFullscreen && (
          <div
            className="mx-auto max-w-full min-w-0 shrink-0"
            style={
              pillBandWidthPx != null
                ? { width: pillBandWidthPx }
                : undefined
            }
          >
            <TaskPicker embedInCard />
          </div>
        )}
      </div>
    </main>
  );
}
