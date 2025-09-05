"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestAudio() {
  const [status, setStatus] = useState<string>("Ready to test");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const testAudio = async () => {
    setStatus("Testing audio...");

    try {
      // Test the API endpoint first
      const response = await fetch("/api/files");
      const data = await response.json();
      console.log("Available files:", data.files);

      if (data.files && data.files.length > 0) {
        const audioFile = data.files.find((file: string) =>
          file.endsWith(".mp3")
        );
        if (audioFile) {
          setStatus(`Found audio file: ${audioFile}`);

          // Create audio element
          const newAudio = new Audio(
            `/api/files/${encodeURIComponent(audioFile)}`
          );

          // Add event listeners
          newAudio.addEventListener("loadstart", () => {
            setStatus("Loading audio...");
            console.log("Audio loading started");
          });

          newAudio.addEventListener("canplay", () => {
            setStatus("Audio ready to play");
            console.log("Audio can play");
          });

          newAudio.addEventListener("play", () => {
            setStatus("Audio is playing!");
            console.log("Audio started playing");
          });

          newAudio.addEventListener("error", (e) => {
            setStatus(
              `Audio error: ${newAudio.error?.message || "Unknown error"}`
            );
            console.error("Audio error:", e);
            console.error("Audio error details:", {
              error: newAudio.error,
              networkState: newAudio.networkState,
              readyState: newAudio.readyState,
              src: newAudio.src,
            });
          });

          setAudio(newAudio);

          // Try to play
          await newAudio.play();
        } else {
          setStatus("No MP3 files found");
        }
      } else {
        setStatus("No files found");
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
      console.error("Test error:", error);
    }
  };

  const playAudio = () => {
    if (audio) {
      audio.play().catch((error) => {
        setStatus(`Play error: ${error.message}`);
        console.error("Play error:", error);
      });
    }
  };

  const pauseAudio = () => {
    if (audio) {
      audio.pause();
      setStatus("Audio paused");
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Audio Test Page</h1>
      <div className="space-y-4">
        <p>Status: {status}</p>
        <Button onClick={testAudio}>Test Audio</Button>
        {audio && (
          <div className="space-x-2">
            <Button onClick={playAudio}>Play</Button>
            <Button onClick={pauseAudio}>Pause</Button>
          </div>
        )}
      </div>
    </div>
  );
}

