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

import Upload from "./upload";

export default function Player() {
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) setFiles(data.files);
    };
    fetchFiles();
  }, []);

  return (
    <div className="flex gap-2 mt-5 items-center justify-center">
      <Select onValueChange={(value) => console.log("Selected file", value)}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select background music" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Your music</SelectLabel>
            {files.map((file) => (
              <SelectItem key={file} value={file}>
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
