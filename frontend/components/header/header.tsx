"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { useTimer, type Phase } from "../timer/useTimer";
import { Settings } from "lucide-react";
import { ChartBar } from "lucide-react";
import { CircleUser } from "lucide-react";
// Removed server action logout; using client-side signOut for proper local session clearing

export default function Header() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUserEmail(data.user?.email ?? null);
      setIsLoadingUser(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 sm:h-16 lg:h-18 justify-between items-center px-3 sm:px-4">
        <div className="font-semibold text-lg sm:text-xl lg:text-2xl">
          Poomo
        </div>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <Button className="cursor-pointer" variant="ghost" size="icon">
            <ChartBar className="cursor-pointer h-4 w-4" />
          </Button>
          <SettingsPopover />

          <Popover>
            <PopoverTrigger asChild>
              <Button className="cursor-pointer" variant="ghost" size="icon">
                <CircleUser className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-90">
              {isLoadingUser ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : userEmail ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-full bg-accent text-accent-foreground h-10 w-10">
                      <CircleUser className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {userEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">Logged in</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">You must log in first.</p>
                  <Button className="w-full" asChild>
                    <a href="/login">Go to Login</a>
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

function SettingsPopover() {
  const musicVolume = useTimer((s) => s.musicVolume);
  const bellVolume = useTimer((s) => s.bellVolume);
  const durations = useTimer((s) => s.durations);
  const setDurations = useTimer((s) => s.setDurations);
  const setMusicVolume = useTimer((s) => s.setMusicVolume);
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
      // refresh preview if not running to reflect new duration
      if (phase !== "IDLE") setPhasePreview(phase as Exclude<Phase, "IDLE">);
    };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="cursor-pointer" variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Audio</div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Music volume</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) =>
                    setMusicVolume(e.currentTarget.valueAsNumber / 100)
                  }
                  className="w-full"
                  style={{ accentColor: "black" }}
                />
              </div>
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
                  style={{ accentColor: "black" }}
                />
              </div>
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
