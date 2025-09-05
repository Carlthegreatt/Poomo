import Timer from "@/components/timer/Timer";
import Player from "@/components/player/Player";
import Header from "@/components/header/header";
import { Toaster } from "sonner";
export default function home() {
  return (
    <div>
      <div className="mt-10 m-20">
        <Header></Header>
      </div>
      <div className="flex flex-col gap-10 items-center mt-20 min-h-screen p-4 sm:p-6 lg:p-8">
        <Timer />
        <Player />
        <Toaster />
      </div>
    </div>
  );
}
