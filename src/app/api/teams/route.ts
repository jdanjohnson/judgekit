import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent } from "@/lib/store";
import { Team } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }
  return NextResponse.json(event.teams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, tableNumber, projectName, description } = body;

  if (!name || !tableNumber) {
    return NextResponse.json(
      { error: "name and tableNumber are required" },
      { status: 400 }
    );
  }

  const team: Team = {
    id: uuidv4(),
    name,
    tableNumber,
    projectName: projectName || "",
    description: description || "",
  };

  const updated = updateEvent((event) => ({
    ...event,
    teams: [...event.teams, team],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(team, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, tableNumber, projectName, description } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateEvent((event) => ({
    ...event,
    teams: event.teams.map((t) =>
      t.id === id
        ? {
            ...t,
            name: name ?? t.name,
            tableNumber: tableNumber ?? t.tableNumber,
            projectName: projectName ?? t.projectName,
            description: description ?? t.description,
          }
        : t
    ),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    updated.teams.find((t) => t.id === id)
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
    teams: event.teams.filter((t) => t.id !== id),
    assignments: event.assignments.filter((a) => a.teamId !== id),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
