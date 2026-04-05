import { NextRequest, NextResponse } from "next/server";
import { getEvent, getAllEventIds } from "@/lib/store";

export async function GET(req: NextRequest) {
  // Require master admin secret if configured
  const masterSecret = process.env.MASTER_ADMIN_SECRET;
  if (masterSecret) {
    const provided = req.headers.get("x-admin-secret");
    if (provided !== masterSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const eventIds = await getAllEventIds();
    const events = [];

    for (const id of eventIds) {
      const event = await getEvent(id);
      if (!event) continue;
      events.push({
        id: event.id,
        name: event.name,
        description: event.description,
        adminPin: event.adminPin,
        createdAt: event.createdAt,
        teamCount: event.teams.length,
        judgeCount: event.judges.length,
        assignmentCount: event.assignments.length,
        judgingStatus: event.judgingStatus ?? "idle",
      });
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error("Admin list error:", err);
    return NextResponse.json(
      { error: "Failed to list events" },
      { status: 500 }
    );
  }
}
