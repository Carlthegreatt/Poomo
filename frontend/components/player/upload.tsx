"use client";
import { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("No file selected");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("File uploaded successfully!");
      setFile(null);
    } else {
      alert("Upload failed.");
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {file && <p className="text-sm">Selected: {file.name}</p>}
      <button
        onClick={handleUpload}
        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Upload
      </button>
    </div>
  );
}
