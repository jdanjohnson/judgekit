"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { EventData, Assignment, Team, Judge } from "@/lib/types";

type Status = Assignment["status"];

const statusMeta: Record<Status, { label: string; bg: string; fg: string }> = {
  pending: { label: "Waiting", bg: "rgba(120,120,128,.18)", fg: "#c9c9cf" },
  in_progress: { label: "Judging", bg: "rgba(255,196,0,.18)", fg: "#ffc400" },
  completed: { label: "Scored", bg: "rgba(191,240,102,.20)", fg: "#bff066" },
};

export default function LiveTrackerPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setLastUpdated(new Date());
        setError("");
      } else {
        setError("No event found.");
      }
    } catch {
      setError("Connection error.");
    }
  }, [eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch + polling
    fetchEvent();
    const interval = setInterval(fetchEvent, 8000);
    return () => clearInterval(interval);
  }, [fetchEvent]);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--hint)" }}
      >
        {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--muted-c)" }}
      >
        Loading…
      </div>
    );
  }

  const completed = event.assignments.filter((a) => a.status === "completed").length;
  const total = event.assignments.length;
  const inProgress = event.assignments.filter((a) => a.status === "in_progress").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const judgingStatus = event.judgingStatus ?? "idle";

  const sortedTeams: Team[] = [...event.teams].sort((a, b) => {
    const an = parseInt(a.tableNumber, 10);
    const bn = parseInt(b.tableNumber, 10);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return (a.tableNumber || a.name).localeCompare(b.tableNumber || b.name);
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-c)",
        padding: "24px 32px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            className="font-serif"
            style={{ fontSize: 40, fontWeight: 200, lineHeight: 1.1 }}
          >
            {event.name}
          </div>
          <div style={{ fontSize: 14, color: "var(--hint)", marginTop: 4 }}>
            Live judging tracker
            {lastUpdated && (
              <span style={{ marginLeft: 10 }}>
                · updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <StatusPill
            label={
              judgingStatus === "active"
                ? "Judging live"
                : judgingStatus === "stopped"
                  ? "Judging closed"
                  : "Not started"
            }
            bg={
              judgingStatus === "active"
                ? "rgba(191,240,102,.20)"
                : judgingStatus === "stopped"
                  ? "rgba(255,120,120,.18)"
                  : "rgba(120,120,128,.18)"
            }
            fg={
              judgingStatus === "active"
                ? "#bff066"
                : judgingStatus === "stopped"
                  ? "#ff7878"
                  : "#c9c9cf"
            }
          />
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Stat label="Teams" value={String(event.teams.length)} />
        <Stat label="Judges" value={String(event.judges.length)} />
        <Stat label="In progress" value={String(inProgress)} accent="#ffc400" />
        <Stat
          label={`Completed · ${progressPct}%`}
          value={`${completed} / ${total}`}
          accent="#bff066"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {sortedTeams.map((team) => {
          const teamAssignments = event.assignments.filter((a) => a.teamId === team.id);
          const teamCompleted = teamAssignments.filter((a) => a.status === "completed").length;
          const teamPrizes = (event.prizes ?? []).filter((p) =>
            p.teamIds.includes(team.id),
          );
          return (
            <div
              key={team.id}
              style={{
                border: "1px solid var(--border-c)",
                borderRadius: 12,
                background: "var(--s1)",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--hint)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Table {team.tableNumber || "—"}
                  </div>
                  <div
                    className="font-serif"
                    style={{
                      fontSize: 20,
                      fontWeight: 300,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {team.name}
                  </div>
                  {team.projectName && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-c)",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {team.projectName}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--hint)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {teamCompleted}/{teamAssignments.length}
                </div>
              </div>

              {teamPrizes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {teamPrizes.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        fontSize: 10,
                        color: "#bff066",
                        border: "1px solid rgba(191,240,102,.35)",
                        borderRadius: 999,
                        padding: "2px 8px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {p.sponsor ? `${p.sponsor} — ` : ""}
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {teamAssignments.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--hint)" }}>
                    No judges assigned yet.
                  </div>
                )}
                {teamAssignments.map((a) => {
                  const judge: Judge | undefined = event.judges.find(
                    (j) => j.id === a.judgeId,
                  );
                  if (!judge) return null;
                  const meta = statusMeta[a.status];
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-c)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {judge.name}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          background: meta.bg,
                          color: meta.fg,
                          padding: "2px 8px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {event.teams.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: "var(--hint)",
              padding: "48px 0",
              fontSize: 14,
            }}
          >
            No teams yet. Add teams in the admin panel and they&apos;ll appear here.
          </div>
        )}
      </div>

      <footer
        style={{
          marginTop: 32,
          fontSize: 11,
          color: "var(--hint)",
          textAlign: "center",
        }}
      >
        Auto-refreshes every 8 seconds. Safe to display on a big screen.
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border-c)",
        borderRadius: 12,
        background: "var(--s1)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--hint)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        className="font-serif"
        style={{
          fontSize: 32,
          fontWeight: 300,
          marginTop: 4,
          color: accent ?? "var(--text-c)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        background: bg,
        color: fg,
        padding: "6px 14px",
        borderRadius: 999,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
