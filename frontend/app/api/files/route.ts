import { NextResponse } from "next/server";
import fs from 'fs';
import path from "path";

export async function GET() {
    const folderPath = path.join((process.cwd()), "/uploads");

    try {
        const files = fs.readdirSync(folderPath);
        return NextResponse.json({files});

    }   catch (error) {
        return NextResponse.json ({error: "Failed to read folder"}, {status: 500});
    }
}