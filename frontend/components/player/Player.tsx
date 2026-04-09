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
  const musicVolume = useTimer((s) => s.musicVolume);
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
      newAudio.volume = Math.min(1, Math.max(0, musicVolume));

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
    [audio, currentFile, musicVolume]
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

  // React to volume changes for currently active audio
  useEffect(() => {
    if (audio) {
      audio.volume = Math.min(1, Math.max(0, musicVolume));
    }
  }, [audio, musicVolume]);

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
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 items-stretch sm:items-center justify-center w-full max-w-md sm:max-w-lg lg:max-w-xl">
      <Select disabled={isRunning} onValueChange={handlePlay}>
        <SelectTrigger className="w-full sm:w-48 lg:w-56 xl:w-64 text-xs sm:text-sm">
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
            {files.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No music uploaded yet
              </div>
            ) : (
              files.map((file) => (
                <SelectItem
                  key={file}
                  value={file}
                  className="text-xs sm:text-sm"
                >
                  {file}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        onClick={togglePlayPause}
        disabled={isLoading || !currentFile}
        size="icon"
      >
        {isLoading ? (
          <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </Button>

      <Upload
        onUploadSuccess={() => {
          fetchFiles();
          onFileUploaded?.();
        }}
      />
    </div>
  );
}
