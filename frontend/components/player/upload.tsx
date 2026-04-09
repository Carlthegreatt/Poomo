"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Upload as UploadIcon } from "lucide-react";
import { useTimer } from "../timer/useTimer";
import { toast } from "sonner";

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
        toast.success("File uploaded successfully!");
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        toast.error("Upload failed.");
      }
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <Button
        onClick={handleButtonClick}
        disabled={isRunning}
        size="icon"
      >
        {uploading ? (
          <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <UploadIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}
