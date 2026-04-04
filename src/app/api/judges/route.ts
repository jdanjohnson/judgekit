import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent, generateAccessCode } from "@/lib/store";
import { Judge } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }
  return NextResponse.json(event.judges);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  let accessCode = generateAccessCode();
  while (event.judges.some((j) => j.accessCode === accessCode)) {
    accessCode = generateAccessCode();
  }

  const judge: Judge = {
    id: uuidv4(),
    name,
    accessCode,
  };

  const updated = updateEvent((ev) => ({
    ...ev,
    judges: [...ev.judges, judge],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(judge, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateEvent((event) => ({
    ...event,
    judges: event.judges.map((j) =>
      j.id === id ? { ...j, name: name ?? j.name } : j
    ),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    updated.judges.find((j) => j.id === id)
  );
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateEvent((event) => ({
    ...event,
    judges: event.judges.filter((j) => j.id !== id),
    assignments: event.assignments.filter((a) => a.judgeId !== id),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
