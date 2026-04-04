import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pin } = body;

  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  if (event.adminPin !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true, eventId: event.id });
}
