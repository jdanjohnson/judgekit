import { NextRequest, NextResponse } from "next/server";
import { getEvent, setEvent, updateEvent, deleteEvent } from "@/lib/store";
import { EventData } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }
  const { adminPin: _pin, ...safeEvent } = event;
  return NextResponse.json(safeEvent);
}

export async function POST(req: NextRequest) {
  const existing = getEvent();
  if (existing) {
    return NextResponse.json(
      { error: "Event already exists. Delete first to create a new one." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { name, description, adminPin } = body;

  if (!name || !adminPin) {
    return NextResponse.json(
      { error: "name and adminPin are required" },
      { status: 400 }
    );
  }

  const event: EventData = {
    id: uuidv4(),
    name,
    description: description || "",
    adminPin,
    criteria: [],
    teams: [],
    judges: [],
    assignments: [],
    createdAt: new Date().toISOString(),
  };

  setEvent(event);
  const { adminPin: _p, ...safeCreated } = event;
  return NextResponse.json(safeCreated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { name, description } = body;

  const updated = updateEvent((event) => ({
    ...event,
    name: name ?? event.name,
    description: description ?? event.description,
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const { adminPin: _pin2, ...safeUpdated } = updated;
  return NextResponse.json(safeUpdated);
}

export async function DELETE() {
  deleteEvent();
  return NextResponse.json({ success: true });
}
