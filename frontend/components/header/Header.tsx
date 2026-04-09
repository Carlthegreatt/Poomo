"use client";

import { type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useTimer, type Phase } from "@/stores/timerStore";
import { Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-2">
      <div className="container flex h-14 sm:h-16 lg:h-18 justify-between items-center px-3 sm:px-4">
        <div className="font-semibold text-lg sm:text-xl lg:text-2xl text-primary">
          Poomo
        </div>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <SettingsPopover />
        </div>
      </div>
    </header>
  );
}

function SettingsPopover() {
  const bellVolume = useTimer((s) => s.bellVolume);
  const durations = useTimer((s) => s.durations);
  const setDurations = useTimer((s) => s.setDurations);
  const setBellVolume = useTimer((s) => s.setBellVolume);
  const phase = useTimer((s) => s.phase);
  const setPhasePreview = useTimer((s) => s.setPhasePreview);

  const workMin = Math.round(durations.WORK / 60000);
  const shortMin = Math.round(durations.BREAK_SHORT / 60000);
  const longMin = Math.round(durations.BREAK_LONG / 60000);

  const handleMinutesChange =
    (key: "WORK" | "BREAK_SHORT" | "BREAK_LONG") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
      const ms = val * 60000;
      setDurations({ [key]: ms });
      if (phase !== "IDLE") setPhasePreview(phase as Exclude<Phase, "IDLE">);
    };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Audio</div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Bell volume</span>
                <span>{Math.round(bellVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(bellVolume * 100)}
                onChange={(e) =>
                  setBellVolume(e.currentTarget.valueAsNumber / 100)
                }
                className="w-full"
                style={{ accentColor: "var(--phase-focus)" }}
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="text-sm font-medium mb-2">Durations (minutes)</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-xs">Focus</div>
                <Input
                  type="number"
                  min={0}
                  value={workMin}
                  onChange={handleMinutesChange("WORK")}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs">Short</div>
                <Input
                  type="number"
                  min={0}
                  value={shortMin}
                  onChange={handleMinutesChange("BREAK_SHORT")}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs">Long</div>
                <Input
                  type="number"
                  min={0}
                  value={longMin}
                  onChange={handleMinutesChange("BREAK_LONG")}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
