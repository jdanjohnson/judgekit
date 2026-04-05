import { NextRequest, NextResponse } from "next/server";
import {
  getEvent,
  setEvent,
  updateEvent,
  deleteEvent,
  generateEventId,
} from "@/lib/store";
import { EventData } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }
  const { adminPin: _pin, ...safeEvent } = event;
  return NextResponse.json(safeEvent);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, adminPin } = body;

  if (!name || !adminPin) {
    return NextResponse.json(
      { error: "name and adminPin are required" },
      { status: 400 }
    );
  }

  const event: EventData = {
    id: generateEventId(),
    name,
    description: description || "",
    adminPin,
    criteria: [],
    teams: [],
    judges: [],
    assignments: [],
    createdAt: new Date().toISOString(),
  };

  await setEvent(event);
  const { adminPin: _p, ...safeCreated } = event;
  return NextResponse.json(safeCreated, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { name, description } = body;

  const updated = await updateEvent(id, (event) => ({
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

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  await deleteEvent(id);
  return NextResponse.json({ success: true });
}
