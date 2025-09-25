"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Upload as UploadIcon } from "lucide-react";
import { useTimer } from "../timer/useTimer";

type MinimalAcceptEntry = {
  description?: string;
  accept: Record<string, string[]>;
};
type MinimalOpenFilePickerOptions = {
  multiple?: boolean;
  types?: MinimalAcceptEntry[];
};
type FileSystemFileHandleLike = { getFile: () => Promise<File> };
type FilePickerWindow = Window & {
  showOpenFilePicker?: (
    options?: MinimalOpenFilePickerOptions
  ) => Promise<FileSystemFileHandleLike[]>;
};

interface UploadProps {
  onUploadSuccess?: () => void;
}

export default function Upload({ onUploadSuccess }: UploadProps = {}) {
  const [uploading, setUploading] = useState(false);
  const isRunning = useTimer((s) => s.isRunning);

  const pickFile = async (): Promise<File | null> => {
    const win =
      typeof window !== "undefined"
        ? (window as unknown as FilePickerWindow)
        : (undefined as unknown as FilePickerWindow);
    const hasFilePicker =
      typeof window !== "undefined" &&
      typeof win.showOpenFilePicker === "function";

    if (hasFilePicker) {
      try {
        const [handle] = await win.showOpenFilePicker!({
          multiple: false,
          types: [
            {
              description: "Audio files",
              accept: { "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".flac"] },
            },
          ],
        });
        const file = await handle.getFile();
        return file as File;
      } catch {
        // If user cancels or API errors, fall through to input fallback
      }
    }

    // Fallback: create input element programmatically (not rendered in JSX)
    return await new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";
      input.multiple = false;
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", () => {
        const file = input.files?.[0] ?? null;
        document.body.removeChild(input);
        resolve(file);
      });
      input.click();
    });
  };

  const handleButtonClick = async () => {
    const selectedFile = await pickFile();
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("File uploaded successfully!");
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        alert("Upload failed.");
      }
    } catch {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <Button
        onClick={handleButtonClick}
        disabled={isRunning}
        className="cursor-pointer w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg disabled:opacity-60 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10"
      >
        {uploading ? (
          "Uploading..."
        ) : (
          <UploadIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5"></UploadIcon>
        )}
      </Button>
    </div>
  );
}
