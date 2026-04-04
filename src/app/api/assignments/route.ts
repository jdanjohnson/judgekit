import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent } from "@/lib/store";
import { Assignment } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const event = getEvent();
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const judgeId = searchParams.get("judgeId");
  const teamId = searchParams.get("teamId");

  let assignments = event.assignments;
  if (judgeId) {
    assignments = assignments.filter((a) => a.judgeId === judgeId);
  }
  if (teamId) {
    assignments = assignments.filter((a) => a.teamId === teamId);
  }

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.autoAssign) {
    return handleAutoAssign(body.judgesPerTeam || 3);
  }

  const { judgeId, teamId } = body;
  if (!judgeId || !teamId) {
    return NextResponse.json(
      { error: "judgeId and teamId are required" },
      { status: 400 }
    );
  }

  const event = getEvent();
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

  const updated = updateEvent((ev) => ({
    ...ev,
    assignments: [...ev.assignments, assignment],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(assignment, { status: 201 });
}

function handleAutoAssign(judgesPerTeam: number) {
  const event = getEvent();
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

  // Count existing assignments
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

  const updated = updateEvent((ev) => ({
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
  const body = await req.json();
  const { id, scores, notes, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateEvent((event) => ({
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

  return NextResponse.json(
    updated.assignments.find((a) => a.id === id)
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
    assignments: event.assignments.filter((a) => a.id !== id),
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
