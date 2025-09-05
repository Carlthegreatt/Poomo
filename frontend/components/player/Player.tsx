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
import { useEffect, useState, useCallback } from "react";
import { useTimer, Phase, onTimerFinished } from "../timer/useTimer";
import { Button } from "../ui/button";
import { Play, Pause } from "lucide-react";

import Upload from "./upload";

interface PlayerProps {
  onFileUploaded?: () => void;
}

export default function Player({ onFileUploaded }: PlayerProps = {}) {
  const isRunning = useTimer((s) => s.isRunning);
  const phase = useTimer((s) => s.phase);
  const [files, setFiles] = useState<string[]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isControlledByTimer, setIsControlledByTimer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Audio control functions
  const pauseAudio = useCallback(() => {
    if (audio && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
      setIsControlledByTimer(true);
      console.log("Audio paused by timer");
    }
  }, [audio]);

  const resumeAudio = useCallback(() => {
    if (audio && audio.paused && currentFile) {
      audio.play().catch((error) => {
        console.error("Error resuming audio:", error);
      });
      setIsControlledByTimer(true);
      console.log("Audio resumed by timer");
    }
  }, [audio, currentFile]);

  // Manual play/pause control
  const togglePlayPause = useCallback(() => {
    if (!audio || !currentFile) return;

    if (audio.paused) {
      audio.play().catch((error) => {
        console.error("Error playing audio manually:", error);
      });
    } else {
      audio.pause();
    }
    setIsControlledByTimer(false); // Manual control takes precedence
  }, [audio, currentFile]);

  const handlePlay = (value: string) => {
    // Stop currently playing audio if any
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }

    // Reset timer control flag when manually selecting audio
    setIsControlledByTimer(false);

    // Create new audio - use the correct path to uploaded files
    const newAudio = new Audio(`/api/files/${encodeURIComponent(value)}`);

    // Add event listeners
    newAudio.addEventListener("loadstart", () => {
      console.log("Audio loading started");
      setIsLoading(true);
    });

    newAudio.addEventListener("canplay", () => {
      console.log("Audio can start playing");
      setIsLoading(false);
    });

    newAudio.addEventListener("play", () => {
      setIsPlaying(true);
      setCurrentFile(value);
      console.log("Audio started playing");
    });

    newAudio.addEventListener("pause", () => {
      setIsPlaying(false);
      console.log("Audio paused");
    });

    newAudio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentFile(null);
      console.log("Audio ended");
    });

    newAudio.addEventListener("error", (e) => {
      console.error("Audio error:", e);
      console.error("Audio error details:", {
        error: newAudio.error,
        networkState: newAudio.networkState,
        readyState: newAudio.readyState,
        src: newAudio.src,
      });
      setIsPlaying(false);
      setCurrentFile(null);
      setIsLoading(false);
    });

    // Set audio properties for better compatibility
    newAudio.preload = "metadata";
    newAudio.volume = 0.7; // Set a reasonable volume

    console.log("Attempting to play audio:", newAudio.src);
    newAudio.play().catch((error) => {
      console.error("Error playing audio:", error);
      console.error("Audio play error details:", {
        name: error.name,
        message: error.message,
        src: newAudio.src,
        readyState: newAudio.readyState,
      });
      setIsPlaying(false);
      setCurrentFile(null);
    });

    setAudio(newAudio);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) {
        // Filter out non-audio files
        const audioFiles = data.files.filter((file: string) =>
          /\.(mp3|wav|ogg|m4a|flac)$/i.test(file)
        );
        setFiles(audioFiles);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Timer integration - pause audio when focus session completes
  useEffect(() => {
    const unsubscribe = onTimerFinished((finishedPhase: Phase) => {
      console.log(`Timer finished: ${finishedPhase}`);
      if (finishedPhase === "WORK") {
        pauseAudio();
        console.log("Audio paused - focus session completed");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pauseAudio]);

  // Timer integration - control audio based on timer state
  useEffect(() => {
    if (isRunning) {
      // Timer started - resume audio if it was paused
      resumeAudio();
    } else {
      // Timer paused - pause audio
      pauseAudio();
    }
  }, [isRunning, resumeAudio, pauseAudio]);

  // Reset timer control flag when timer phase changes to IDLE
  useEffect(() => {
    if (phase === "IDLE") {
      setIsControlledByTimer(false);
    }
  }, [phase]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  return (
    <div className="flex sm:flex-row gap-2 sm:gap-3 lg:gap-4 items-center justify-center w-full max-w-md sm:max-w-lg lg:max-w-xl">
      <Select disabled={isRunning} onValueChange={handlePlay}>
        <SelectTrigger className="sm:w-48 lg:w-56 xl:w-64 text-xs sm:text-sm">
          <SelectValue
            placeholder={
              isPlaying
                ? `Now playing: ${currentFile}${
                    isControlledByTimer ? " (Timer controlled)" : ""
                  }`
                : "Select background music"
            }
          />
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

      {/* Manual play/pause button */}
      {currentFile && (
        <Button
          onClick={togglePlayPause}
          disabled={isRunning || isLoading}
          className="cursor-pointer px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg disabled:opacity-60 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10"
        >
          {isLoading ? (
            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          ) : (
            <Play className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          )}
        </Button>
      )}

      <Upload onUploadSuccess={() => fetchFiles()} />
    </div>
  );
}
