import { NextRequest, NextResponse } from "next/server";
import { updateEvent } from "@/lib/store";
import { Criterion } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

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
  const { name, description, maxScore, weight } = body;

  if (!name || maxScore === undefined) {
    return NextResponse.json(
      { error: "name and maxScore are required" },
      { status: 400 }
    );
  }

  const criterion: Criterion = {
    id: uuidv4(),
    name,
    description: description || "",
    maxScore: Number(maxScore),
    weight: weight !== undefined ? Number(weight) : 1,
  };

  const updated = await updateEvent(eventId, (event) => ({
    ...event,
    criteria: [...event.criteria, criterion],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(criterion, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { id, name, description, maxScore, weight } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await updateEvent(eventId, (event) => ({
    ...event,
    criteria: event.criteria.map((c) =>
      c.id === id
        ? {
            ...c,
            name: name ?? c.name,
            description: description ?? c.description,
            maxScore: maxScore !== undefined ? Number(maxScore) : c.maxScore,
            weight: weight !== undefined ? Number(weight) : c.weight,
          }
        : c
    ),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(updated.criteria.find((c) => c.id === id));
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const id = searchParams.get("id");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await updateEvent(eventId, (event) => ({
    ...event,
    criteria: event.criteria.filter((c) => c.id !== id),
    assignments: event.assignments.map((a) => ({
      ...a,
      scores: a.scores.filter((s) => s.criterionId !== id),
    })),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
