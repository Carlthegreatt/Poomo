import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;
  
  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "uploads", filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = "audio/mpeg"; // default to mp3
    
    switch (ext) {
      case ".mp3":
        contentType = "audio/mpeg";
        break;
      case ".wav":
        contentType = "audio/wav";
        break;
      case ".ogg":
        contentType = "audio/ogg";
        break;
      case ".m4a":
        contentType = "audio/mp4";
        break;
      case ".flac":
        contentType = "audio/flac";
        break;
      default:
        contentType = "audio/mpeg";
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
