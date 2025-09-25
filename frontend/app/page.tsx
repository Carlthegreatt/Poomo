"use client";
import Timer from "@/components/timer/Timer";
import Player from "@/components/player/Player";
import Header from "@/components/header/header";
import { Toaster } from "sonner";
import { useState } from "react";
import supabase from "@/lib/supabaseClient";

export default function Home() {
  console.log(supabase);
  const [, setRefreshTrigger] = useState(0);

  const handleFileUploaded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
          <Timer />
          <Player onFileUploaded={handleFileUploaded} />
        </div>
      </div>
      <Toaster position="top-center"></Toaster>
    </div>
  );
}
