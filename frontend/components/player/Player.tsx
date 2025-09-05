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
import { useEffect, useState, useCallback, useRef } from "react";
import { useTimer } from "../timer/useTimer";
import { Button } from "../ui/button";
import { Play, Pause } from "lucide-react";

import Upload from "./upload";

interface PlayerProps {
  onFileUploaded?: () => void;
}

export default function Player({ onFileUploaded }: PlayerProps = {}) {
  const isRunning = useTimer((s) => s.isRunning);
  const [files, setFiles] = useState<string[]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple play/pause control
  const togglePlayPause = useCallback(() => {
    if (!audio || !currentFile) return;

    if (audio.paused) {
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    } else {
      audio.pause();
    }
  }, [audio, currentFile]);

  const handlePlay = useCallback(
    (value: string) => {
      // If we already have an audio element and it's the same file, just play/pause
      if (audio && currentFile === value) {
        if (audio.paused) {
          audio.play().catch((error) => {
            console.error("Error playing audio:", error);
          });
        } else {
          audio.pause();
        }
        return;
      }

      // Stop currently playing audio if any
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }

      // Create new audio element only if we don't have one or it's a different file
      const newAudio = audio || new Audio();

      // Set the source
      newAudio.src = `/api/files/${encodeURIComponent(value)}`;

      // Set audio properties
      newAudio.preload = "metadata";
      newAudio.volume = 0.7;

      // Add event listeners (only if this is a new audio element)
      if (!audio) {
        newAudio.addEventListener("loadstart", () => {
          setIsLoading(true);
        });

        newAudio.addEventListener("canplay", () => {
          setIsLoading(false);
        });

        newAudio.addEventListener("play", () => {
          setIsPlaying(true);
          setCurrentFile(value);
        });

        newAudio.addEventListener("pause", () => {
          setIsPlaying(false);
        });

        newAudio.addEventListener("ended", () => {
          setIsPlaying(false);
          setCurrentFile(null);
        });

        newAudio.addEventListener("error", () => {
          console.error("Audio error:", newAudio.error);
          setIsPlaying(false);
          setCurrentFile(null);
          setIsLoading(false);
        });
      }

      // Play the audio with better error handling
      const playAudio = async () => {
        try {
          // Wait for the audio to be ready if it's not already
          if (newAudio.readyState < 2) {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error("Audio loading timeout"));
              }, 5000);

              newAudio.addEventListener(
                "canplay",
                () => {
                  clearTimeout(timeout);
                  resolve(void 0);
                },
                { once: true }
              );

              newAudio.addEventListener(
                "error",
                () => {
                  clearTimeout(timeout);
                  reject(new Error("Audio loading error"));
                },
                { once: true }
              );
            });
          }

          await newAudio.play();
        } catch (error) {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
          setCurrentFile(null);
        }
      };

      playAudio();

      // Only set audio state if it's a new element
      if (!audio) {
        setAudio(newAudio);
      } else {
        // Update current file for existing audio element
        setCurrentFile(value);
      }
    },
    [audio, currentFile]
  );

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

  // Timer integration - pause audio when timer stops, resume when timer starts
  useEffect(() => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the audio operations to prevent rapid calls
    const timeout = setTimeout(() => {
      if (!isRunning && audio && !audio.paused) {
        // Pause audio when timer stops
        audio.pause();
      }
    }, 100); // 100ms debounce

    debounceTimeoutRef.current = timeout;

    // Cleanup function
    return () => {
      clearTimeout(timeout);
    };
  }, [isRunning, audio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex sm:flex-row gap-2 sm:gap-3 lg:gap-4 items-center justify-center w-full max-w-md sm:max-w-lg lg:max-w-xl">
      <Select disabled={isRunning} onValueChange={handlePlay}>
        <SelectTrigger className="sm:w-48 lg:w-56 xl:w-64 text-xs sm:text-sm">
          <SelectValue
            placeholder={
              isPlaying
                ? `Now playing: ${currentFile}`
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
          disabled={isLoading}
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
