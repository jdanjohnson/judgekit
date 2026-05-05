import { NextRequest, NextResponse } from "next/server";
import { getEvent, getAllEventIds } from "@/lib/store";

export async function GET(req: NextRequest) {
  // Require master admin secret if configured
  const masterSecret = process.env.MASTER_ADMIN_SECRET;
  const provided = req.headers.get("x-admin-secret");
  const isAuthenticated = masterSecret ? provided === masterSecret : true;

  if (masterSecret && !isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
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
        // Only expose sensitive fields when authenticated with master secret
        ...(isAuthenticated ? { adminPin: event.adminPin } : {}),
        eventDate: event.eventDate ?? "",
        createdAt: event.createdAt,
        teamCount: event.teams.length,
        judgeCount: event.judges.length,
        assignmentCount: event.assignments.length,
        judgingStatus: event.judgingStatus ?? "idle",
        ...(isAuthenticated ? {
          judges: event.judges.map((j) => ({ id: j.id, name: j.name, accessCode: j.accessCode })),
          teams: event.teams.map((t) => ({ id: t.id, name: t.name, tableNumber: t.tableNumber, projectName: t.projectName })),
        } : {
          judges: event.judges.map((j) => ({ id: j.id, name: j.name })),
          teams: event.teams.map((t) => ({ id: t.id, name: t.name, tableNumber: t.tableNumber })),
        }),
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
