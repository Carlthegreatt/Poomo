"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";

export default function uploadFile() {
  const [uploading, setUploading] = useState(false);

  const pickFile = async (): Promise<File | null> => {
    const hasFilePicker =
      typeof window !== "undefined" &&
      typeof (window as any).showOpenFilePicker === "function";

    if (hasFilePicker) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
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
      } catch (err) {
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
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleButtonClick}
        disabled={uploading}
        className="px-3 py-1 bg-blue-900 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
      >
        {uploading ? "Uploading..." : <Upload></Upload>}
      </Button>
    </div>
  );
}
