"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EventData, Assignment, Team, Criterion } from "@/lib/types";

export default function JudgePortal() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const code = (params.code as string).toUpperCase();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const eq = `eventId=${encodeURIComponent(eventId)}`;

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/event?id=${encodeURIComponent(eventId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        const judge = data.judges.find(
          (j: { accessCode: string }) => j.accessCode === code,
        );
        if (!judge) {
          setError("Invalid access code. Please check and try again.");
        }
      } else {
        setError("No event found.");
      }
    } catch {
      setError("Connection error.");
    }
    setLoading(false);
  }, [code, eventId]);

  useEffect(() => {
    fetchEvent(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch
  }, [fetchEvent]);

  // Timer tick
  useEffect(() => {
    if (event?.judgingStatus === "active") {
      setTimerNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- sync timer on status change
      timerRef.current = setInterval(() => setTimerNow(Date.now()), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (event?.judgingStartedAt) {
        // Use stored stop time if available, otherwise fall back to now
        const stopTime = event.judgingStoppedAt ? new Date(event.judgingStoppedAt).getTime() : Date.now();
        setTimerNow(stopTime);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
  }, [event?.judgingStatus, event?.judgingStartedAt, event?.judgingStoppedAt]);

  function formatTimer(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const judge = event?.judges.find((j) => j.accessCode === code);
  const myAssignments =
    event?.assignments.filter((a) => a.judgeId === judge?.id) || [];
  const completedCount = myAssignments.filter(
    (a) => a.status === "completed",
  ).length;
  const judgingActive = (event?.judgingStatus ?? "idle") === "active";
  const judgingStopped = (event?.judgingStatus ?? "idle") === "stopped";

  function toggleTeam(assignmentId: string) {
    if (openTeam === assignmentId) {
      setOpenTeam(null);
    } else {
      setOpenTeam(assignmentId);
      const assignment = myAssignments.find((a) => a.id === assignmentId);
      if (assignment) {
        const existingScores: Record<string, number> = {};
        for (const s of assignment.scores) {
          existingScores[s.criterionId] = s.value;
        }
        setScores(existingScores);
        setNotes(assignment.notes);
      }
    }
  }

  function setScore(criterionId: string, value: number) {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }

  async function saveScores(assignmentId: string, complete: boolean) {
    if (!event) return;
    const assignment = myAssignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    setSaving(true);
    try {
      const scoreArray = Object.entries(scores).map(
        ([criterionId, value]) => ({ criterionId, value }),
      );
      const res = await fetch(`/api/assignments?${eq}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignment.id,
          scores: scoreArray,
          notes,
          status: complete ? "completed" : "in_progress",
        }),
      });
      if (res.ok) {
        toast.success(complete ? "Evaluation submitted!" : "Progress saved");
        await fetchEvent();
        if (complete) setOpenTeam(null);
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error ?? "Failed to save";
        toast.error(msg);
        await fetchEvent();
      }
    } catch {
      toast.error("Connection error");
    }
    setSaving(false);
  }

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

  if (!event || !judge) return null;

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
          maxWidth: 640,
          margin: "0 auto",
          padding: "28px 24px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 20,
            borderBottom: "1px solid var(--border-c)",
            marginBottom: judgingActive || judgingStopped ? 0 : 24,
          }}
        >
          <div>
            <div
              className="font-serif"
              style={{ fontSize: 28, fontWeight: 200, lineHeight: 1.1 }}
            >
              {judge.name}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--muted-c)", marginTop: 5 }}
            >
              {event.name} &middot;{" "}
              <span style={{ color: "#66f0c2" }}>{code}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="font-serif"
              style={{
                fontSize: 32,
                fontWeight: 200,
                color: "#bff066",
                lineHeight: 1,
              }}
            >
              {completedCount}/{myAssignments.length}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--muted-c)", marginTop: 2 }}
            >
              scored
            </div>
          </div>
        </div>

        {/* Timer & status banner */}
        {(judgingActive || judgingStopped) && (
          <div
            style={{
              padding: "12px 0",
              marginBottom: 20,
              borderBottom: "1px solid var(--border-c)",
              textAlign: "center",
            }}
          >
            {event.judgingStartedAt && (() => {
              const elapsed = timerNow - new Date(event.judgingStartedAt).getTime();
              const duration = (event.judgingDuration ?? 0) * 60 * 1000;
              const hasLimit = duration > 0;
              const remaining = hasLimit ? duration - elapsed : 0;
              const isOver = hasLimit && remaining <= 0;
              const displayMs = hasLimit ? Math.abs(remaining) : elapsed;
              return (
                <div
                  className="font-serif"
                  style={{
                    fontSize: 28,
                    fontWeight: 200,
                    color: isOver ? "#f07070" : judgingActive ? "#bff066" : "var(--muted-c)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isOver ? "-" : ""}{formatTimer(displayMs)}
                </div>
              );
            })()}
            {judgingStopped && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#f0c866",
                  fontWeight: 500,
                }}
              >
                Judging has been paused by the organizer
              </div>
            )}
          </div>
        )}

        {/* Organizer notes card */}
        {event.organizerNotes && (
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--border-c)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#f0c866",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Notes from organizers
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-c)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {event.organizerNotes}
            </div>
          </div>
        )}

        {/* Team list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myAssignments.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--muted-c)",
                fontSize: 13,
              }}
            >
              No teams assigned yet. The organizer will assign teams to you.
            </div>
          )}

          {myAssignments.map((assignment: Assignment) => {
            const team = event.teams.find(
              (t: Team) => t.id === assignment.teamId,
            );
            if (!team) return null;
            const isOpen = openTeam === assignment.id;

            return (
              <div
                key={assignment.id}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--border-c)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Team card header */}
                <div
                  onClick={() => toggleTeam(assignment.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--hint)",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      Table {team.tableNumber}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-c)" }}>
                      {team.name}
                    </div>
                    {team.projectName && (
                      <div
                        style={{ fontSize: 12, color: "var(--muted-c)" }}
                      >
                        {team.projectName}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    {assignment.status === "completed" ? (
                      <span className="pill pill-green">
                        <span className="pill-dot" /> Done
                      </span>
                    ) : assignment.status === "in_progress" ? (
                      <span className="pill pill-amber">
                        <span className="pill-dot" /> In progress
                      </span>
                    ) : (
                      <span className="pill pill-gray">
                        <span className="pill-dot" /> Pending
                      </span>
                    )}
                    <span
                      style={{
                        color: "var(--muted-c)",
                        fontSize: 12,
                        transition: "transform .2s",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                      }}
                    >
                      &#9662;
                    </span>
                  </div>
                </div>

                {/* Expanded scoring body */}
                {isOpen && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-c)",
                      padding: "18px 16px",
                    }}
                  >
                    {event.criteria.map((criterion: Criterion) => (
                      <div key={criterion.id} style={{ marginBottom: 15 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--muted-c)",
                            }}
                          >
                            {criterion.name}
                          </span>
                          <span
                            className="font-serif"
                            style={{
                              fontSize: 17,
                              fontWeight: 200,
                              color: "#bff066",
                            }}
                          >
                            {scores[criterion.id] ?? 0}/{criterion.maxScore}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={criterion.maxScore}
                          value={scores[criterion.id] ?? 0}
                          onChange={(e) =>
                            setScore(criterion.id, Number(e.target.value))
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                    ))}

                    <div style={{ marginBottom: 13, marginTop: 4 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "var(--muted-c)",
                          marginBottom: 5,
                        }}
                      >
                        Notes
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional feedback..."
                        style={{
                          width: "100%",
                          background: "var(--s2)",
                          border: "1px solid var(--border-c)",
                          borderRadius: 8,
                          color: "var(--text-c)",
                          padding: "9px 11px",
                          fontSize: 12,
                          resize: "none",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 13,
                      }}
                    >
                      <button
                        onClick={() => setOpenTeam(null)}
                        style={{
                          background: "none",
                          border: "1px solid var(--border-c)",
                          color: "var(--muted-c)",
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={saving || judgingStopped}
                        onClick={() => saveScores(assignment.id, false)}
                        style={{
                          background: "none",
                          border: "1px solid var(--border-c)",
                          color: "var(--muted-c)",
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          cursor: judgingStopped ? "not-allowed" : "pointer",
                          opacity: judgingStopped ? 0.4 : 1,
                        }}
                      >
                        Save draft
                      </button>
                      <button
                        disabled={saving || judgingStopped}
                        onClick={() => saveScores(assignment.id, true)}
                        style={{
                          background: "#bff066",
                          color: "#0c0c0d",
                          border: "none",
                          padding: "7px 16px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: judgingStopped ? "not-allowed" : "pointer",
                          opacity: saving || judgingStopped ? 0.4 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Submit"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
