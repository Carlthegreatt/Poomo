"use client";
import Timer from "@/components/timer/Timer";
import Player from "@/components/player/Player";
import Header from "@/components/header/header";
import Sidebar from "@/components/nav/Sidebar";
import { Toaster } from "sonner";
import PageTransition from "@/components/ui/PageTransition";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Sidebar />
      <PageTransition>
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8 sm:pl-20">
          <div className="w-full max-w-4xl flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
            <Timer />
            <Player />
          </div>
        </div>
      </PageTransition>
      <Toaster position="top-center" />
    </div>
  );
}
