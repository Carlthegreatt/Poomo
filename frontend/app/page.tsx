import Timer from "@/components/timer/Timer";
import Player from "@/components/player/Player";
export default function home() {
  return (
    <div className="flex flex-col items-center h-screen">
      <Timer></Timer>
      <Player></Player>
    </div>
  );
}
