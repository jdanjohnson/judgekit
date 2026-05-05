import { NextRequest, NextResponse } from "next/server";
import { updateEvent } from "@/lib/store";
import { Prize } from "@/lib/types";
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
  const { name, sponsor, description } = body;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const prize: Prize = {
    id: uuidv4(),
    name,
    sponsor: sponsor || "",
    description: description || "",
    teamIds: [],
    judgeIds: [],
  };

  const updated = await updateEvent(eventId, (event) => ({
    ...event,
    prizes: [...(event.prizes ?? []), prize],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(prize, { status: 201 });
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
  const { id, name, sponsor, description, teamIds, judgeIds } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await updateEvent(eventId, (event) => {
    const validTeamIds = new Set(event.teams.map((t) => t.id));
    const validJudgeIds = new Set(event.judges.map((j) => j.id));
    const cleanStrArr = (xs: unknown, valid: Set<string>): string[] => {
      if (!Array.isArray(xs)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const x of xs) {
        if (typeof x === "string" && valid.has(x) && !seen.has(x)) {
          seen.add(x);
          out.push(x);
        }
      }
      return out;
    };
    return {
      ...event,
      prizes: (event.prizes ?? []).map((p) =>
        p.id === id
          ? {
              ...p,
              name: name ?? p.name,
              sponsor: sponsor ?? p.sponsor,
              description: description ?? p.description,
              teamIds:
                teamIds !== undefined
                  ? cleanStrArr(teamIds, validTeamIds)
                  : p.teamIds,
              judgeIds:
                judgeIds !== undefined
                  ? cleanStrArr(judgeIds, validJudgeIds)
                  : p.judgeIds,
            }
          : p
      ),
    };
  });

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(updated.prizes.find((p) => p.id === id));
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
    prizes: (event.prizes ?? []).filter((p) => p.id !== id),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
