import { NextRequest, NextResponse } from "next/server";
import { updateEvent } from "@/lib/store";
import { Team } from "@/lib/types";
import { parseCSV, normalize } from "@/lib/csv";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/import/devpost?eventId=...
 *
 * Body: raw CSV text (Content-Type: text/csv or text/plain).
 *
 * Idempotent: a team is matched by (case-insensitive, whitespace-collapsed)
 * Project Title. Re-running the import only adds teams whose title isn't
 * already present; for teams that already exist, prize membership is still
 * reconciled from the row so newly-created prizes can be backfilled.
 *
 * Prize matching: each "Opt In: ..." column + the free-form "Opt-In Prize"
 * column is fuzzy-matched against existing prize names by normalized
 * substring on a set of keywords. Opt-ins that can't be mapped to any
 * existing prize are returned as `unmappedOptIns` so the admin can create
 * the missing prize and re-run the import.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 },
    );
  }

  const csvText = await req.text();
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
  }

  const { headers, rows } = parseCSV(csvText);
  if (headers.length === 0) {
    return NextResponse.json(
      { error: "Could not parse CSV headers" },
      { status: 400 },
    );
  }

  const idx = (name: string) =>
    headers.findIndex((h) => normalize(h) === normalize(name));
  const firstIdxMatching = (regex: RegExp) =>
    headers.findIndex((h) => regex.test(h));

  const titleCol = idx("Project Title");
  if (titleCol === -1) {
    return NextResponse.json(
      {
        error:
          "CSV missing 'Project Title' header. Is this a Devpost projects export?",
      },
      { status: 400 },
    );
  }
  const submitterFirstCol = idx("Submitter First Name");
  const submitterLastCol = idx("Submitter Last Name");
  const submitterEmailCol = idx("Submitter Email");
  const aboutCol = firstIdxMatching(/^about the project$/i);
  const submissionUrlCol = idx("Submission Url");
  const primaryPrizeCol = firstIdxMatching(/^opt.?in prize$/i);

  const optInCols: { header: string; index: number }[] = headers
    .map((h, i) => ({ header: h, index: i }))
    .filter((x) => /^opt.in:/i.test(x.header));

  // Snapshot mutations so we can apply them atomically inside updateEvent.
  let added = 0;
  let skipped = 0;
  let prizeLinks = 0;
  const unmappedOptIns = new Set<string>();

  const updated = await updateEvent(eventId, (event) => {
    const teams = [...event.teams];
    const prizes = (event.prizes ?? []).map((p) => ({
      ...p,
      teamIds: [...p.teamIds],
    }));

    const nextTableNum = () => {
      const used = teams
        .map((t) => parseInt(t.tableNumber, 10))
        .filter((n) => !Number.isNaN(n));
      return String(used.length > 0 ? Math.max(...used) + 1 : 1);
    };

    const findPrizeByKeywords = (rawValue: string) => {
      const v = normalize(rawValue);
      if (!v) return null;
      // Check against each prize name + sponsor
      for (const p of prizes) {
        const hay = `${normalize(p.name)} ${normalize(p.sponsor)}`;
        // Keyword-wise: pick any token >= 4 chars from the opt-in value and
        // check if it appears in the prize's hay.
        const tokens = v.split(/\s+/).filter((t) => t.length >= 4);
        if (tokens.some((t) => hay.includes(t))) return p;
        // Also try the whole normalized value as a substring.
        if (hay.includes(v) || v.includes(normalize(p.name))) return p;
      }
      return null;
    };

    for (const row of rows) {
      const title = (row[titleCol] ?? "").trim();
      if (!title) continue;

      const existing = teams.find(
        (t) => normalize(t.projectName) === normalize(title),
      );

      let team: Team;
      if (existing) {
        team = existing;
        skipped++;
      } else {
        const firstName = (row[submitterFirstCol] ?? "").trim();
        const lastName = (row[submitterLastCol] ?? "").trim();
        const email = (row[submitterEmailCol] ?? "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || title;

        const aboutRaw = aboutCol !== -1 ? (row[aboutCol] ?? "").trim() : "";
        const submissionUrl =
          submissionUrlCol !== -1 ? (row[submissionUrlCol] ?? "").trim() : "";
        const descParts: string[] = [];
        if (aboutRaw) descParts.push(aboutRaw);
        if (submissionUrl) descParts.push(`Devpost: ${submissionUrl}`);
        if (email) descParts.push(`Submitter: ${email}`);

        team = {
          id: uuidv4(),
          name: fullName,
          tableNumber: nextTableNum(),
          projectName: title,
          description: descParts.join("\n\n"),
        };
        teams.push(team);
        added++;
      }

      // Resolve prize memberships for this row:
      //   - Primary "Opt-In Prize" column (free-form string)
      //   - Every "Opt In: X" column whose value is truthy/"Yes"
      const candidatePrizeValues: string[] = [];
      if (primaryPrizeCol !== -1) {
        const v = (row[primaryPrizeCol] ?? "").trim();
        if (v) candidatePrizeValues.push(v);
      }
      for (const { header, index } of optInCols) {
        const v = (row[index] ?? "").trim().toLowerCase();
        if (v === "yes" || v === "true" || v === "1" || v === "y") {
          // Strip the "Opt In: " prefix so we match on the sponsor phrase.
          candidatePrizeValues.push(header.replace(/^opt.in:\s*/i, ""));
        }
      }

      for (const val of candidatePrizeValues) {
        const prize = findPrizeByKeywords(val);
        if (!prize) {
          unmappedOptIns.add(val);
          continue;
        }
        if (!prize.teamIds.includes(team.id)) {
          prize.teamIds.push(team.id);
          prizeLinks++;
        }
      }
    }

    return { ...event, teams, prizes };
  });

  if (!updated) {
    return NextResponse.json({ error: "No event found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      added,
      skipped,
      prizeLinks,
      unmappedOptIns: Array.from(unmappedOptIns),
      totalTeams: updated.teams.length,
    },
    { status: 200 },
  );
}
