import Timer from "@/components/timer/Timer";
import Player from "@/components/player/Player";
import Header from "@/components/header/header";
import { Toaster } from "sonner";

export default function home() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl flex flex-col items-center gap-7 sm:gap-8 lg:gap-">
          <Timer />
          <Player />
        </div>
      </div>
      <Toaster />
    </div>
  );
}
