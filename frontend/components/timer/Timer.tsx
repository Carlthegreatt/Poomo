"use client";

import { Button } from "../ui/button";
import { Upload } from "lucide-react";
import React, { useEffect } from "react";
import { useTimer, onTimerFinished, Phase } from "./useTimer";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Timer() {
  const phase = useTimer((s) => s.phase);
  const isRunning = useTimer((s) => s.isRunning);
  const remainingMs = useTimer((s) => s.remainingMs);
  const durations = useTimer((s) => s.durations);
  const cycleCount = useTimer((s) => s.cycleCount);
  const start = useTimer((s) => s.start);
  const pause = useTimer((s) => s.pause);
  const resume = useTimer((s) => s.resume);
  const reset = useTimer((s) => s.reset);
  const setAutoAdvance = useTimer((s) => s.setAutoAdvance);
  const autoAdvance = useTimer((s) => s.autoAdvance);

  useEffect(() => {
    let worker: Worker | null = null;
    let intervalId: number | null = null;
    if (typeof window != "undefined" && "Worker" in window) {
      try {
        worker = new Worker("/worker/timer.worker.js");
        worker.postMessage({ cmd: "start", ms: 250 });
        worker.onmessage = (e) => {
          if (e.data?.type === "tick") {
            useTimer.getState().tick(e.data.now);
          }
        };
      } catch (err) {
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

  const mm = Math.floor(remainingMs / 60000)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor((remainingMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const totalMs =
    phase === "WORK"
      ? durations.WORK
      : phase == "BREAK_SHORT"
      ? durations.BREAK_SHORT
      : phase === "BREAK_LONG"
      ? durations.BREAK_LONG
      : 0;

  const progress = totalMs
    ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100))
    : 0;

  return (
    <main>
      <div className="flex-col flex  h-screen items-center justify-center gap-10  ">
        <div className="flex gap-4">
          <Button
            variant={"outline"}
            className="rounded-full"
            onClick={() => start("WORK")}
          >
            Focus
          </Button>
          <Button
            variant={"outline"}
            className="rounded-full"
            onClick={() => start("BREAK_SHORT")}
          >
            Short Break
          </Button>
          <Button
            variant={"outline"}
            className="rounded-full"
            onClick={() => start("BREAK_LONG")}
          >
            Long Break
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center grid-col gap-20 shadow-2xl bg-neutral-100 w-[65vh] h-[45vh] rounded-4xl">
          <div></div>
          <div className="font-bold text-9xl">
            {mm}:{ss}
          </div>
          <div>
            <Button className="text-lg h-12 w-30">Start</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select background music" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Your music</SelectLabel>
                <SelectItem value="White Noise">White Noise</SelectItem>
                <SelectItem value="Brown Noise">Brown Noise</SelectItem>
                <SelectItem value="Lo Fi">Lo Fi</SelectItem>
                <SelectItem value="grapes">Mozart</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button>
            <Upload></Upload>
          </Button>
        </div>
      </div>
    </main>
  );
}
