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

  if (body.rebalance) {
    return handleRebalance(eventId, body.judgesPerTeam || 3);
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
  const precheck = await getEvent(eventId);
  if (!precheck) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  if (precheck.judges.length === 0 || precheck.teams.length === 0) {
    return NextResponse.json(
      { error: "Need at least one judge and one team" },
      { status: 400 }
    );
  }

  let createdCount = 0;
  const updated = await updateEvent(eventId, (ev) => {
    const effectiveJudgesPerTeam = Math.min(judgesPerTeam, ev.judges.length);

    const judgeLoad: Record<string, number> = {};
    ev.judges.forEach((j) => {
      judgeLoad[j.id] = 0;
    });
    ev.assignments.forEach((a) => {
      if (judgeLoad[a.judgeId] !== undefined) {
        judgeLoad[a.judgeId]++;
      }
    });

    const toAdd: Assignment[] = [];
    for (const team of ev.teams) {
      const existingJudgeIds = ev.assignments
        .filter((a) => a.teamId === team.id)
        .map((a) => a.judgeId);

      const needed = effectiveJudgesPerTeam - existingJudgeIds.length;
      if (needed <= 0) continue;

      const available = ev.judges
        .filter((j) => !existingJudgeIds.includes(j.id))
        .sort((a, b) => (judgeLoad[a.id] || 0) - (judgeLoad[b.id] || 0));

      for (let i = 0; i < Math.min(needed, available.length); i++) {
        const judge = available[i];
        toAdd.push({
          id: uuidv4(),
          judgeId: judge.id,
          teamId: team.id,
          scores: [],
          notes: "",
          status: "pending",
        });
        judgeLoad[judge.id] = (judgeLoad[judge.id] || 0) + 1;
      }
    }

    createdCount = toAdd.length;
    return {
      ...ev,
      assignments: [...ev.assignments, ...toAdd],
    };
  });

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    { created: createdCount, assignments: updated.assignments },
    { status: 201 }
  );
}

async function handleAutoAssignPrize(eventId: string, prizeId: string) {
  const precheck = await getEvent(eventId);
  if (!precheck) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const prize = (precheck.prizes ?? []).find((p) => p.id === prizeId);
  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  const validTeamIds = new Set(precheck.teams.map((t) => t.id));
  const validJudgeIds = new Set(precheck.judges.map((j) => j.id));
  const teamIds = prize.teamIds.filter((id) => validTeamIds.has(id));
  const judgeIds = prize.judgeIds.filter((id) => validJudgeIds.has(id));

  if (judgeIds.length === 0 || teamIds.length === 0) {
    return NextResponse.json(
      {
        error:
          "Prize needs at least one opted-in team and one assigned judge before auto-assigning.",
      },
      { status: 400 }
    );
  }

  let createdCount = 0;
  const updated = await updateEvent(eventId, (ev) => {
    // Re-filter against the fresh snapshot to stay correct under concurrent
    // judge/team deletions, and re-check existing pairs to close the TOCTOU.
    const freshValidTeamIds = new Set(ev.teams.map((t) => t.id));
    const freshValidJudgeIds = new Set(ev.judges.map((j) => j.id));
    const freshPrize = (ev.prizes ?? []).find((p) => p.id === prizeId);
    const freshTeamIds =
      freshPrize?.teamIds.filter((id) => freshValidTeamIds.has(id)) ?? [];
    const freshJudgeIds =
      freshPrize?.judgeIds.filter((id) => freshValidJudgeIds.has(id)) ?? [];

    const existingPairs = new Set(
      ev.assignments.map((a) => `${a.judgeId}::${a.teamId}`)
    );

    const toAdd: Assignment[] = [];
    for (const judgeId of freshJudgeIds) {
      for (const teamId of freshTeamIds) {
        const key = `${judgeId}::${teamId}`;
        if (existingPairs.has(key)) continue;
        existingPairs.add(key);
        toAdd.push({
          id: uuidv4(),
          judgeId,
          teamId,
          scores: [],
          notes: "",
          status: "pending",
        });
      }
    }

    createdCount = toAdd.length;
    if (toAdd.length === 0) return ev;
    return {
      ...ev,
      assignments: [...ev.assignments, ...toAdd],
    };
  });

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    { created: createdCount, assignments: updated.assignments },
    { status: createdCount > 0 ? 201 : 200 }
  );
}

async function handleRebalance(eventId: string, judgesPerTeam: number) {
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

  const effectiveJudgesPerTeam = Math.min(judgesPerTeam, event.judges.length);

  // Protected pairs survive the rebalance:
  //   1. Any assignment whose status is not "pending" (judge has started or finished scoring)
  //   2. Any (judgeId, teamId) pair baked into a prize's judgeIds x teamIds matrix
  const protectedPairs = new Set<string>();
  const key = (judgeId: string, teamId: string) => `${judgeId}::${teamId}`;

  for (const prize of event.prizes ?? []) {
    for (const jId of prize.judgeIds) {
      for (const tId of prize.teamIds) {
        protectedPairs.add(key(jId, tId));
      }
    }
  }
  for (const a of event.assignments) {
    if (a.status !== "pending") protectedPairs.add(key(a.judgeId, a.teamId));
  }

  const keptAssignments = event.assignments.filter((a) =>
    protectedPairs.has(key(a.judgeId, a.teamId))
  );
  const removedCount = event.assignments.length - keptAssignments.length;

  // Seed judge load with protected assignments so filling prefers lightly-loaded judges.
  const judgeLoad: Record<string, number> = {};
  event.judges.forEach((j) => {
    judgeLoad[j.id] = 0;
  });
  keptAssignments.forEach((a) => {
    if (judgeLoad[a.judgeId] !== undefined) judgeLoad[a.judgeId]++;
  });

  const newAssignments: Assignment[] = [];
  for (const team of event.teams) {
    const existingJudgeIds = keptAssignments
      .filter((a) => a.teamId === team.id)
      .map((a) => a.judgeId);
    const needed = effectiveJudgesPerTeam - existingJudgeIds.length;
    if (needed <= 0) continue;

    const available = event.judges
      .filter((j) => !existingJudgeIds.includes(j.id))
      .sort((a, b) => (judgeLoad[a.id] || 0) - (judgeLoad[b.id] || 0));

    for (let i = 0; i < Math.min(needed, available.length); i++) {
      const judge = available[i];
      newAssignments.push({
        id: uuidv4(),
        judgeId: judge.id,
        teamId: team.id,
        scores: [],
        notes: "",
        status: "pending",
      });
      judgeLoad[judge.id] = (judgeLoad[judge.id] || 0) + 1;
    }
  }

  const updated = await updateEvent(eventId, (ev) => ({
    ...ev,
    assignments: [...keptAssignments, ...newAssignments],
  }));

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      kept: keptAssignments.length,
      removed: removedCount,
      created: newAssignments.length,
      assignments: updated.assignments,
    },
    { status: 200 }
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
