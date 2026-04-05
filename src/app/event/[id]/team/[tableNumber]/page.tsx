"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventData, Assignment } from "@/lib/types";

export default function TeamView() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const tableNumber = decodeURIComponent(params.tableNumber as string);

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/event?id=${encodeURIComponent(eventId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setError("");
        const team = data.teams.find(
          (t: { tableNumber: string }) => t.tableNumber === tableNumber,
        );
        if (!team) {
          setError(`No team found at table ${tableNumber}.`);
        }
      } else {
        setError("No event found.");
      }
    } catch {
      setError("Connection error.");
    }
    setLoading(false);
  }, [tableNumber, eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch + polling
    fetchEvent();
    const interval = setInterval(fetchEvent, 15000);
    return () => clearInterval(interval);
  }, [fetchEvent]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--muted-c)" }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="flex items-center justify-between px-6"
          style={{
            height: 50,
            borderBottom: "1px solid var(--border-c)",
            background: "var(--s1)",
          }}
        >
          <span
            className="font-serif text-[19px] font-extralight tracking-tight"
            style={{ color: "var(--text-c)" }}
          >
            Judge<span className="text-lime font-normal">Kit</span>
          </span>
        </div>
        <div
          className="flex-1 flex items-start justify-center"
          style={{ paddingTop: 60 }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{ color: "#f07070", fontSize: 14, marginBottom: 16 }}
            >
              {error}
            </div>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "none",
                border: "1px solid var(--border-c)",
                borderRadius: 8,
                color: "var(--muted-c)",
                padding: "9px 18px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const team = event.teams.find((t) => t.tableNumber === tableNumber);
  if (!team) return null;

  const teamAssignments = event.assignments.filter(
    (a) => a.teamId === team.id,
  );
  const completedCount = teamAssignments.filter(
    (a) => a.status === "completed",
  ).length;
  const allDone =
    teamAssignments.length > 0 && completedCount === teamAssignments.length;

  const scoreTotals: Record<string, { sum: number; count: number }> = {};
  for (const a of teamAssignments) {
    if (a.status !== "completed") continue;
    for (const s of a.scores) {
      if (!scoreTotals[s.criterionId]) {
        scoreTotals[s.criterionId] = { sum: 0, count: 0 };
      }
      scoreTotals[s.criterionId].sum += s.value;
      scoreTotals[s.criterionId].count += 1;
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6"
        style={{
          height: 50,
          borderBottom: "1px solid var(--border-c)",
          background: "var(--s1)",
        }}
      >
        <span
          className="font-serif text-[19px] font-extralight tracking-tight"
          style={{ color: "var(--text-c)" }}
        >
          Judge<span className="text-lime font-normal">Kit</span>
        </span>
        <button
          className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{
            color: "var(--muted-c)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => router.push("/")}
        >
          &larr; back
        </button>
      </div>

      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "28px 24px",
          width: "100%",
        }}
      >
        {/* Team header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "var(--s2)",
              border: "1px solid var(--border-c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              className="font-serif"
              style={{ fontSize: 18, fontWeight: 200 }}
            >
              {team.tableNumber}
            </span>
          </div>
          <div>
            <div
              className="font-serif"
              style={{ fontSize: 22, fontWeight: 200, lineHeight: 1.1 }}
            >
              {team.name}
            </div>
            {team.projectName && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-c)",
                  marginTop: 3,
                }}
              >
                {team.projectName}
              </div>
            )}
          </div>
        </div>

        {/* Assigned judges */}
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--hint)",
            marginBottom: 10,
          }}
        >
          Assigned judges
        </div>

        {teamAssignments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px 0",
              color: "var(--muted-c)",
              fontSize: 13,
            }}
          >
            No judges assigned yet. Check back later.
          </div>
        ) : (
          teamAssignments.map((assignment: Assignment) => {
            const assignedJudge = event.judges.find(
              (j) => j.id === assignment.judgeId,
            );
            if (!assignedJudge) return null;
            return (
              <div
                key={assignment.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 14px",
                  background: "var(--s1)",
                  border: "1px solid var(--border-c)",
                  borderRadius: 8,
                  marginBottom: 7,
                }}
              >
                <div>
                  <div style={{ fontSize: 13 }}>{assignedJudge.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-c)",
                      marginTop: 2,
                    }}
                  >
                    {assignment.status === "completed"
                      ? "Scoring complete"
                      : assignment.status === "in_progress"
                        ? "Scoring in progress"
                        : "Not started"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                  }}
                >
                  {assignment.status === "completed" ? (
                    <>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#66f0c2",
                        }}
                      />
                      <span style={{ color: "#66f0c2" }}>Done</span>
                    </>
                  ) : assignment.status === "in_progress" ? (
                    <>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#f0c866",
                        }}
                      />
                      <span style={{ color: "#f0c866" }}>Scoring</span>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--hint)",
                        }}
                      />
                      <span style={{ color: "var(--hint)" }}>Waiting</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Scores section */}
        {allDone ? (
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--border-c)",
              borderRadius: 12,
              padding: 16,
              marginTop: 18,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--hint)",
                marginBottom: 12,
              }}
            >
              Scores
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {event.criteria.map((c) => {
                const data = scoreTotals[c.id];
                const avg =
                  data && data.count > 0
                    ? (data.sum / data.count).toFixed(1)
                    : "\u2014";
                return (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--s2)",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-c)",
                        marginBottom: 3,
                      }}
                    >
                      {c.name}
                    </div>
                    <div>
                      <span
                        className="font-serif"
                        style={{ fontSize: 19, fontWeight: 200 }}
                      >
                        {avg}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--muted-c)",
                          marginLeft: 2,
                        }}
                      >
                        /{c.maxScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 13,
                borderTop: "1px solid var(--border-c)",
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted-c)" }}>
                Average total
              </span>
              <span
                className="font-serif"
                style={{ fontSize: 19, fontWeight: 200, color: "#bff066" }}
              >
                {(() => {
                  let total = 0;
                  let count = 0;
                  for (const c of event.criteria) {
                    const d = scoreTotals[c.id];
                    if (d && d.count > 0) {
                      total += d.sum / d.count;
                      count++;
                    }
                  }
                  return count > 0 ? total.toFixed(1) : "\u2014";
                })()}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--s2)",
              border: "1px solid var(--border-c)",
              borderRadius: 8,
              padding: "14px 16px",
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--s3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              &#9675;
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-c)" }}>
                Scores are hidden
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-c)",
                  marginTop: 2,
                }}
              >
                The organizer will release results after judging is complete.
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--hint)",
            marginTop: 20,
          }}
        >
          This page auto-refreshes every 15 seconds.
        </div>
      </div>
    </div>
  );
}
