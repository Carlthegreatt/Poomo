"use client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useTimer, Phase } from "../timer/useTimer";

import Upload from "./upload";

export default function Player() {
  const isRunning = useTimer((s) => s.isRunning);
  const [files, setFiles] = useState<string[]>([]);

  const[(audio, setAudio)] = useState<HTMLAudioElement | null>(null);

  const handlePlay = (value: string) => {
    // Stop currently playing audio if any
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Create new audio
    const newAudio = new Audio(`/sounds/${value}.mp3`);
    newAudio.play();
    setAudio(newAudio);
  };

  useEffect(() => {
    const fetchFiles = async () => {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) setFiles(data.files);
    };
    fetchFiles();
  }, []);

  return (
    <div className="flex sm:flex-row gap-2 sm:gap-3 lg:gap-4 items-center justify-center w-full max-w-md sm:max-w-lg lg:max-w-xl">
      <Select
        disabled={isRunning}
        onValueChange={(value) => console.log("Selected file", value)}
      >
        <SelectTrigger className="sm:w-48 lg:w-56 xl:w-64 text-xs sm:text-sm">
          <SelectValue placeholder="Select background music" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Your music</SelectLabel>
            {files.map((file) => (
              <SelectItem
                key={file}
                value={file}
                className="text-xs sm:text-sm"
              >
                {file}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Upload />
    </div>
  );
}
