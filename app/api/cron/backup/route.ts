import { NextResponse, type NextRequest } from "next/server";
import { createBackup } from "@/lib/backup";

export const maxDuration = 300;

// Daily at 02:00 Tashkent (vercel.json), authorised with CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await createBackup());
}
