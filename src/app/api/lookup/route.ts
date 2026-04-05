import { NextRequest, NextResponse } from "next/server";
import { getEvent, getAllEventIds } from "@/lib/store";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const upper = code.toUpperCase();

  try {
    const eventIds = await getAllEventIds();

    for (const eid of eventIds) {
      const event = await getEvent(eid);
      if (!event) continue;

      // Check if it's a judge access code
      const judge = event.judges.find((j) => j.accessCode === upper);
      if (judge) {
        return NextResponse.json({
          type: "judge",
          eventId: event.id,
          code: judge.accessCode,
          judgeName: judge.name,
        });
      }

      // Check if it's a table number
      const team = event.teams.find(
        (t) => t.tableNumber.toUpperCase() === upper
      );
      if (team) {
        return NextResponse.json({
          type: "team",
          eventId: event.id,
          tableNumber: team.tableNumber,
          teamName: team.name,
        });
      }
    }

    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  } catch (err) {
    console.error("Lookup error:", err);
    return NextResponse.json(
      { error: "Failed to look up code" },
      { status: 500 }
    );
  }
}
