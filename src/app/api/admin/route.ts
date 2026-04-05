import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { pin } = body;

  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  if (event.adminPin !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true, eventId: event.id });
}
