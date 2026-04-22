import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent } from "@/lib/store";
import { Assignment } from "@/lib/types";
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

  if (body.autoAssign) {
    return handleAutoAssign(eventId, body.judgesPerTeam || 3);
  }

  if (body.autoAssignPrize) {
    return handleAutoAssignPrize(eventId, body.autoAssignPrize);
  }

  const { judgeId, teamId } = body;
  if (!judgeId || !teamId) {
    return NextResponse.json(
      { error: "judgeId and teamId are required" },
      { status: 400 }
    );
  }

  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const existing = event.assignments.find(
    (a) => a.judgeId === judgeId && a.teamId === teamId
  );
  if (existing) {
    return NextResponse.json(
      { error: "Assignment already exists" },
      { status: 409 }
    );
  }

  const assignment: Assignment = {
    id: uuidv4(),
    judgeId,
    teamId,
    scores: [],
    notes: "",
    status: "pending",
  };

  const updated = await updateEvent(eventId, (ev) => ({
    ...ev,
    assignments: [...ev.assignments, assignment],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(assignment, { status: 201 });
}

async function handleAutoAssign(eventId: string, judgesPerTeam: number) {
  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  if (event.judges.length === 0 || event.teams.length === 0) {
    return NextResponse.json(
      { error: "Need at least one judge and one team" },
      { status: 400 }
    );
  }

  const effectiveJudgesPerTeam = Math.min(
    judgesPerTeam,
    event.judges.length
  );

  const newAssignments: Assignment[] = [];
  const judgeLoad: Record<string, number> = {};
  event.judges.forEach((j) => {
    judgeLoad[j.id] = 0;
  });

  event.assignments.forEach((a) => {
    if (judgeLoad[a.judgeId] !== undefined) {
      judgeLoad[a.judgeId]++;
    }
  });

  for (const team of event.teams) {
    const existingJudgeIds = event.assignments
      .filter((a) => a.teamId === team.id)
      .map((a) => a.judgeId);

    const needed = effectiveJudgesPerTeam - existingJudgeIds.length;
    if (needed <= 0) continue;

    const available = event.judges
      .filter((j) => !existingJudgeIds.includes(j.id))
      .sort((a, b) => (judgeLoad[a.id] || 0) - (judgeLoad[b.id] || 0));

    for (let i = 0; i < Math.min(needed, available.length); i++) {
      const judge = available[i];
      const assignment: Assignment = {
        id: uuidv4(),
        judgeId: judge.id,
        teamId: team.id,
        scores: [],
        notes: "",
        status: "pending",
      };
      newAssignments.push(assignment);
      judgeLoad[judge.id] = (judgeLoad[judge.id] || 0) + 1;
    }
  }

  const updated = await updateEvent(eventId, (ev) => ({
    ...ev,
    assignments: [...ev.assignments, ...newAssignments],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    { created: newAssignments.length, assignments: updated.assignments },
    { status: 201 }
  );
}

async function handleAutoAssignPrize(eventId: string, prizeId: string) {
  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const prize = (event.prizes ?? []).find((p) => p.id === prizeId);
  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  if (prize.judgeIds.length === 0 || prize.teamIds.length === 0) {
    return NextResponse.json(
      {
        error:
          "Prize needs at least one opted-in team and one assigned judge before auto-assigning.",
      },
      { status: 400 }
    );
  }

  const validTeamIds = new Set(event.teams.map((t) => t.id));
  const validJudgeIds = new Set(event.judges.map((j) => j.id));
  const teamIds = prize.teamIds.filter((id) => validTeamIds.has(id));
  const judgeIds = prize.judgeIds.filter((id) => validJudgeIds.has(id));

  const existingPairs = new Set(
    event.assignments.map((a) => `${a.judgeId}::${a.teamId}`)
  );

  const newAssignments: Assignment[] = [];
  for (const judgeId of judgeIds) {
    for (const teamId of teamIds) {
      const key = `${judgeId}::${teamId}`;
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      newAssignments.push({
        id: uuidv4(),
        judgeId,
        teamId,
        scores: [],
        notes: "",
        status: "pending",
      });
    }
  }

  if (newAssignments.length === 0) {
    return NextResponse.json(
      { created: 0, assignments: event.assignments },
      { status: 200 }
    );
  }

  const updated = await updateEvent(eventId, (ev) => ({
    ...ev,
    assignments: [...ev.assignments, ...newAssignments],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    { created: newAssignments.length, assignments: updated.assignments },
    { status: 201 }
  );
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

  // Check if judging is stopped — reject score submissions
  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }
  if (event.judgingStatus === "stopped") {
    return NextResponse.json(
      { error: "Judging is currently stopped" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { id, scores, notes, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await updateEvent(eventId, (event) => ({
    ...event,
    assignments: event.assignments.map((a) =>
      a.id === id
        ? {
            ...a,
            scores: scores ?? a.scores,
            notes: notes ?? a.notes,
            status: status ?? a.status,
          }
        : a
    ),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(updated.assignments.find((a) => a.id === id));
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
    assignments: event.assignments.filter((a) => a.id !== id),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
