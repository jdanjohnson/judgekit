import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/store";
import { EventData } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  const format = searchParams.get("format") || "json";

  if (format === "csv") {
    return exportCSV(event);
  }

  const { adminPin: _pin, ...safeEvent } = event;
  return NextResponse.json(safeEvent);
}

function exportCSV(event: EventData) {

  const headers = [
    "Team Name",
    "Table Number",
    "Project Name",
    "Judge Name",
    "Status",
    ...event.criteria.map((c) => c.name),
    (event.useWeightedScoring ?? true) ? "Weighted Total" : "Average Score",
    "Notes",
  ];

  const rows: string[][] = [];

  for (const assignment of event.assignments) {
    const team = event.teams.find((t) => t.id === assignment.teamId);
    const judge = event.judges.find((j) => j.id === assignment.judgeId);
    if (!team || !judge) continue;

    const criteriaScores = event.criteria.map((c) => {
      const score = assignment.scores.find((s) => s.criterionId === c.id);
      return score ? String(score.value) : "";
    });

    let finalScore = "";
    if (event.useWeightedScoring ?? true) {
      let weightedTotal = 0;
      let totalWeight = 0;
      for (const c of event.criteria) {
        const score = assignment.scores.find((s) => s.criterionId === c.id);
        if (score) {
          weightedTotal += (score.value / c.maxScore) * c.weight;
          totalWeight += c.weight;
        }
      }
      finalScore = totalWeight > 0 ? ((weightedTotal / totalWeight) * 100).toFixed(1) : "";
    } else {
      let sum = 0;
      let count = 0;
      for (const c of event.criteria) {
        const score = assignment.scores.find((s) => s.criterionId === c.id);
        if (score) {
          sum += (score.value / c.maxScore) * 100;
          count++;
        }
      }
      finalScore = count > 0 ? (sum / count).toFixed(1) : "";
    }

    rows.push([
      team.name,
      team.tableNumber,
      team.projectName,
      judge.name,
      assignment.status,
      ...criteriaScores,
      finalScore,
      assignment.notes,
    ].map((cell) => cell.replace(/"/g, '""')));
  }

  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-z0-9]/gi, "_")}_results.csv"`,
    },
  });
}
