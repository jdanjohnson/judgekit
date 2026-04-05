"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EventData, Team, Judge, Criterion } from "@/lib/types";

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Form states
  const [teamName, setTeamName] = useState("");
  const [teamTable, setTeamTable] = useState("");
  const [teamProject, setTeamProject] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [critName, setCritName] = useState("");
  const [critMax, setCritMax] = useState("10");
  const [critWeight, setCritWeight] = useState("1");
  const [judgesPerTeam, setJudgesPerTeam] = useState("3");
  const [bulkTeams, setBulkTeams] = useState(false);
  const [bulkTeamText, setBulkTeamText] = useState("");
  const [bulkJudges, setBulkJudges] = useState(false);
  const [bulkJudgeText, setBulkJudgeText] = useState("");
  const [assignJudgeId, setAssignJudgeId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState("0");
  const [timerNow, setTimerNow] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Failed to load event");
    }
    setLoading(false);
  }, [router, eventId]);

  useEffect(() => {
    const pin = sessionStorage.getItem("adminPin");
    if (!pin) {
      router.push("/");
      return;
    }
    fetchEvent(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch
  }, [router, fetchEvent]);

  // Sync edit form when event loads or changes
  useEffect(() => {
    if (event) {
      setEditName(event.name); // eslint-disable-line react-hooks/set-state-in-effect -- sync form with loaded event
      setEditDesc(event.description);
      setEditDuration(String(event.judgingDuration ?? 0));
    }
  }, [event]);

  // Timer tick
  useEffect(() => {
    if (event?.judgingStatus === "active") {
      setTimerNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- sync timer on status change
      timerRef.current = setInterval(() => setTimerNow(Date.now()), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (event?.judgingStartedAt) {
        setTimerNow(Date.now());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
  }, [event?.judgingStatus, event?.judgingStartedAt]);

  const eq = `eventId=${encodeURIComponent(eventId)}`;

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName || !teamTable) {
      toast.error("Team name and table number required");
      return;
    }
    try {
      const res = await fetch(`/api/teams?${eq}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          tableNumber: teamTable,
          projectName: teamProject,
          description: "",
        }),
      });
      if (res.ok) {
        toast.success("Team added");
        setTeamName("");
        setTeamTable("");
        setTeamProject("");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to add team");
    }
  }

  async function bulkAddTeams() {
    const lines = bulkTeamText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste at least one line");
      return;
    }
    let added = 0;
    let errors = 0;
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0] || "";
      const tableNumber = parts[1] || "";
      const projectName = parts[2] || "";
      if (!name || !tableNumber) {
        errors++;
        continue;
      }
      try {
        const res = await fetch(`/api/teams?${eq}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tableNumber, projectName, description: "" }),
        });
        if (res.ok) added++;
        else errors++;
      } catch {
        errors++;
      }
    }
    if (added > 0) {
      toast.success(`Added ${added} team${added > 1 ? "s" : ""}`);
      setBulkTeamText("");
      setBulkTeams(false);
      fetchEvent();
    }
    if (errors > 0) {
      toast.error(`${errors} line${errors > 1 ? "s" : ""} failed (need: name, table #)`);
    }
  }

  async function deleteTeam(id: string) {
    try {
      await fetch(`/api/teams?${eq}&id=${id}`, { method: "DELETE" });
      toast.success("Team removed");
      fetchEvent();
    } catch {
      toast.error("Failed to delete team");
    }
  }

  async function addJudge(e: React.FormEvent) {
    e.preventDefault();
    if (!judgeName) {
      toast.error("Judge name required");
      return;
    }
    try {
      const res = await fetch(`/api/judges?${eq}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: judgeName }),
      });
      if (res.ok) {
        toast.success("Judge added");
        setJudgeName("");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to add judge");
    }
  }

  async function bulkAddJudges() {
    const names = bulkJudgeText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      toast.error("Enter at least one name");
      return;
    }
    let added = 0;
    let errors = 0;
    for (const name of names) {
      try {
        const res = await fetch(`/api/judges?${eq}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) added++;
        else errors++;
      } catch {
        errors++;
      }
    }
    if (added > 0) {
      toast.success(`Added ${added} judge${added > 1 ? "s" : ""}`);
      setBulkJudgeText("");
      setBulkJudges(false);
      fetchEvent();
    }
    if (errors > 0) {
      toast.error(`${errors} name${errors > 1 ? "s" : ""} failed`);
    }
  }

  async function deleteJudge(id: string) {
    try {
      await fetch(`/api/judges?${eq}&id=${id}`, { method: "DELETE" });
      toast.success("Judge removed");
      fetchEvent();
    } catch {
      toast.error("Failed to delete judge");
    }
  }

  async function addCriterion(e: React.FormEvent) {
    e.preventDefault();
    if (!critName) {
      toast.error("Criterion name required");
      return;
    }
    try {
      const res = await fetch(`/api/criteria?${eq}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: critName,
          description: "",
          maxScore: Number(critMax),
          weight: Number(critWeight),
        }),
      });
      if (res.ok) {
        toast.success("Criterion added");
        setCritName("");
        setCritMax("10");
        setCritWeight("1");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to add criterion");
    }
  }

  async function deleteCriterion(id: string) {
    try {
      await fetch(`/api/criteria?${eq}&id=${id}`, { method: "DELETE" });
      toast.success("Criterion removed");
      fetchEvent();
    } catch {
      toast.error("Failed to delete criterion");
    }
  }

  async function addManualAssignment() {
    if (!assignJudgeId || !assignTeamId) {
      toast.error("Select both a judge and a team");
      return;
    }
    try {
      const res = await fetch(`/api/assignments?${eq}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId: assignJudgeId, teamId: assignTeamId }),
      });
      if (res.ok) {
        toast.success("Assignment added");
        setAssignJudgeId("");
        setAssignTeamId("");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to assign");
      }
    } catch {
      toast.error("Failed to add assignment");
    }
  }

  async function deleteAssignment(id: string) {
    try {
      await fetch(`/api/assignments?${eq}&id=${id}`, { method: "DELETE" });
      toast.success("Assignment removed");
      fetchEvent();
    } catch {
      toast.error("Failed to remove assignment");
    }
  }

  async function autoAssign() {
    try {
      const res = await fetch(`/api/assignments?${eq}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoAssign: true,
          judgesPerTeam: Number(judgesPerTeam),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Created ${data.created} assignments`);
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to auto-assign");
    }
  }

  async function clearAssignments() {
    if (!event) return;
    try {
      for (const a of event.assignments) {
        await fetch(`/api/assignments?${eq}&id=${a.id}`, {
          method: "DELETE",
        });
      }
      toast.success("All assignments cleared");
      fetchEvent();
    } catch {
      toast.error("Failed to clear assignments");
    }
  }

  async function updateEventSettings() {
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          judgingDuration: Number(editDuration) || 0,
        }),
      });
      if (res.ok) {
        toast.success("Settings saved");
        fetchEvent();
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    }
  }

  async function toggleJudging() {
    if (!event) return;
    const isActive = (event.judgingStatus ?? "idle") === "active";
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgingStatus: isActive ? "stopped" : "active",
          judgingStartedAt: isActive ? event.judgingStartedAt : new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success(isActive ? "Judging stopped" : "Judging started!");
        fetchEvent();
      } else {
        toast.error("Failed to update judging status");
      }
    } catch {
      toast.error("Failed to update judging status");
    }
  }

  async function resetJudging() {
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgingStatus: "idle",
          judgingStartedAt: null,
        }),
      });
      if (res.ok) {
        toast.success("Timer reset");
        fetchEvent();
      } else {
        toast.error("Failed to reset");
      }
    } catch {
      toast.error("Failed to reset");
    }
  }

  function formatTimer(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${label}`);
  }

  function getBaseUrl() {
    return typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  }

  async function exportData(format: "csv" | "json") {
    try {
      const res = await fetch(
        `/api/export?${eq}&format=${format}&pin=${encodeURIComponent(sessionStorage.getItem("adminPin") || "")}`,
      );
      if (!res.ok) {
        toast.error("Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch {
      toast.error("Export error");
    }
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

  if (!event) return null;

  const completedAssignments = event.assignments.filter(
    (a) => a.status === "completed",
  ).length;
  const totalAssignments = event.assignments.length;
  const progressPercent =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

  const sidebarItems = [
    {
      group: "Panels",
      items: [
        {
          key: "overview",
          label: "Overview",
          badge: progressPercent === 100 ? "done" : "live",
        },
        { key: "teams", label: "Teams", badge: String(event.teams.length) },
        { key: "judges", label: "Judges", badge: String(event.judges.length) },
        {
          key: "criteria",
          label: "Criteria",
          badge: String(event.criteria.length),
        },
        {
          key: "assign",
          label: "Assignments",
          badge: String(event.assignments.length),
        },
        { key: "share", label: "Share", badge: null },
        { key: "settings", label: "Settings", badge: null },
      ],
    },
    {
      group: "Export",
      items: [
        { key: "csv", label: "CSV \u2193", badge: null },
        { key: "json", label: "JSON \u2193", badge: null },
      ],
    },
    {
      group: "Event",
      items: [{ key: "new", label: "New event +", badge: null }],
    },
  ];

  const tblStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };
  const thStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "var(--hint)",
    textAlign: "left",
    padding: "5px 8px",
    borderBottom: "1px solid var(--border-c)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "9px 8px",
    borderBottom: "1px solid rgba(42,42,47,.5)",
    verticalAlign: "middle",
    fontSize: 12,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--s2)",
    border: "1px solid var(--border-c)",
    borderRadius: 8,
    color: "var(--text-c)",
    padding: "8px 11px",
    fontSize: 13,
    outline: "none",
  };

  function handleSideClick(key: string) {
    if (key === "csv") {
      exportData("csv");
      return;
    }
    if (key === "json") {
      exportData("json");
      return;
    }
    if (key === "new") {
      router.push("/create");
      return;
    }
    setActiveTab(key);
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

      {/* Admin layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "196px 1fr",
          gap: 12,
          padding: "20px 24px 36px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            background: "var(--s1)",
            border: "1px solid var(--border-c)",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              padding: "4px 8px 10px",
              borderBottom: "1px solid var(--border-c)",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-c)" }}>
              {event.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 1 }}>
              Event &middot; active
            </div>
          </div>

          {sidebarItems.map((group) => (
            <div key={group.group}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--hint)",
                  padding: "8px 8px 3px",
                  marginTop: 2,
                }}
              >
                {group.group}
              </div>
              {group.items.map((item) => (
                <div
                  key={item.key}
                  onClick={() => handleSideClick(item.key)}
                  style={{
                    padding: "7px 9px",
                    borderRadius: 8,
                    color:
                      activeTab === item.key ? "#bff066" : "var(--muted-c)",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background:
                      activeTab === item.key
                        ? "rgba(191,240,102,.1)"
                        : "transparent",
                    transition: "background .12s, color .12s",
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "var(--s3)",
                        padding: "1px 6px",
                        borderRadius: 100,
                        color: "var(--muted-c)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            background: "var(--s1)",
            border: "1px solid var(--border-c)",
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 440,
          }}
        >
          {/* Overview */}
          {activeTab === "overview" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Overview
                </h2>
                {(event.judgingStatus ?? "idle") === "active" ? (
                  <span className="pill pill-green">
                    <span className="pill-dot" /> Judging
                  </span>
                ) : (event.judgingStatus ?? "idle") === "stopped" ? (
                  <span className="pill pill-amber">
                    <span className="pill-dot" /> Stopped
                  </span>
                ) : (
                  <span className="pill pill-gray">
                    <span className="pill-dot" /> Idle
                  </span>
                )}
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 8,
                    marginBottom: 18,
                  }}
                >
                  {[
                    { n: event.teams.length, l: "Teams" },
                    { n: event.judges.length, l: "Judges" },
                    { n: `${progressPercent}%`, l: "Scored" },
                    { n: event.criteria.length, l: "Criteria" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      style={{
                        background: "var(--s2)",
                        borderRadius: 8,
                        padding: "11px 12px",
                      }}
                    >
                      <div
                        className="font-serif"
                        style={{
                          fontSize: 26,
                          fontWeight: 200,
                          lineHeight: 1,
                          marginBottom: 3,
                        }}
                      >
                        {s.n}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-c)" }}>
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Judging controls & timer */}
                <div
                  style={{
                    background: "var(--s2)",
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: event.judgingStartedAt ? 12 : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={toggleJudging}
                        style={{
                          background: (event.judgingStatus ?? "idle") === "active" ? "#f07070" : "#bff066",
                          color: "#0c0c0d",
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 16px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {(event.judgingStatus ?? "idle") === "active" ? "Stop Judging" : "Start Judging"}
                      </button>
                      {(event.judgingStatus ?? "idle") !== "idle" && (
                        <button
                          onClick={resetJudging}
                          style={{
                            background: "none",
                            border: "1px solid var(--border-c)",
                            borderRadius: 8,
                            padding: "7px 12px",
                            fontSize: 11,
                            color: "var(--muted-c)",
                            cursor: "pointer",
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {(event.judgingDuration ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: "var(--muted-c)" }}>
                        Duration: {event.judgingDuration}m
                      </span>
                    )}
                  </div>
                  {event.judgingStartedAt && (() => {
                    const elapsed = timerNow - new Date(event.judgingStartedAt).getTime();
                    const duration = (event.judgingDuration ?? 0) * 60 * 1000;
                    const hasLimit = duration > 0;
                    const remaining = hasLimit ? duration - elapsed : 0;
                    const isOver = hasLimit && remaining <= 0;
                    const displayMs = hasLimit ? Math.abs(remaining) : elapsed;
                    return (
                      <div style={{ textAlign: "center" }}>
                        <div
                          className="font-serif"
                          style={{
                            fontSize: 40,
                            fontWeight: 200,
                            color: isOver ? "#f07070" : (event.judgingStatus ?? "idle") === "active" ? "#bff066" : "var(--muted-c)",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {isOver ? "-" : ""}{formatTimer(displayMs)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted-c)", marginTop: 4 }}>
                          {(event.judgingStatus ?? "idle") === "active"
                            ? (hasLimit ? (isOver ? "overtime" : "remaining") : "elapsed")
                            : (event.judgingStatus ?? "idle") === "stopped" ? "stopped" : ""}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Auto-assign controls */}
                {event.judges.length > 0 && event.teams.length > 0 && (
                  <div
                    style={{
                      background: "var(--s2)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--muted-c)" }}>
                      Judges per team:
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={judgesPerTeam}
                      onChange={(e) => setJudgesPerTeam(e.target.value)}
                      style={{
                        width: 50,
                        background: "var(--s3)",
                        border: "1px solid var(--border-c)",
                        borderRadius: 6,
                        color: "var(--text-c)",
                        padding: "4px 8px",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={autoAssign}
                      style={{
                        background: "#bff066",
                        color: "#0c0c0d",
                        border: "none",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Auto-assign
                    </button>
                    {event.assignments.length > 0 && (
                      <button
                        onClick={clearAssignments}
                        style={{
                          background: "none",
                          border: "1px solid var(--border-c)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 11,
                          color: "var(--muted-c)",
                          cursor: "pointer",
                        }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                  }}
                >
                  Judge progress
                </div>
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Judge</th>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Done</th>
                      <th style={thStyle}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.judges.map((judge: Judge) => {
                      const ja = event.assignments.filter(
                        (a) => a.judgeId === judge.id,
                      );
                      const done = ja.filter(
                        (a) => a.status === "completed",
                      ).length;
                      const pct =
                        ja.length > 0
                          ? Math.round((done / ja.length) * 100)
                          : 0;
                      return (
                        <tr key={judge.id}>
                          <td style={tdStyle}>{judge.name}</td>
                          <td style={tdStyle}>
                            <span className="code-chip">
                              {judge.accessCode}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {done}/{ja.length}
                          </td>
                          <td style={tdStyle}>
                            <div className="pbar">
                              <div
                                className={`pfill ${pct === 100 ? "pfill-l" : "pfill-a"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {event.judges.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            color: "var(--hint)",
                          }}
                        >
                          No judges yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Teams */}
          {activeTab === "teams" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Teams
                </h2>
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <button
                    onClick={() => setBulkTeams(!bulkTeams)}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-c)",
                      borderRadius: 8,
                      color: bulkTeams ? "#bff066" : "var(--muted-c)",
                      padding: "5px 12px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {bulkTeams ? "Single add" : "Bulk import"}
                  </button>
                </div>

                {bulkTeams ? (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 10, color: "var(--hint)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      One team per line: name, table #, project name
                    </label>
                    <textarea
                      rows={6}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono, monospace)", fontSize: 12, lineHeight: 1.7 }}
                      placeholder={"Rocket Builders, T01, LaunchPad\nAI Wizards, T02, MindMap\nGreen Team, T03, EcoTrack"}
                      value={bulkTeamText}
                      onChange={(e) => setBulkTeamText(e.target.value)}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--hint)" }}>
                        {bulkTeamText.split("\n").filter((l) => l.trim()).length} line{bulkTeamText.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={bulkAddTeams}
                        style={{
                          background: "#bff066",
                          border: "none",
                          borderRadius: 8,
                          color: "#0c0c0d",
                          padding: "8px 16px",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Import all
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={addTeam}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 1fr auto",
                      gap: 8,
                      marginBottom: 16,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Name
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="Team name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Table #
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="T01"
                        value={teamTable}
                        onChange={(e) => setTeamTable(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Project
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="Project name"
                        value={teamProject}
                        onChange={(e) => setTeamProject(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        background: "#bff066",
                        border: "none",
                        borderRadius: 8,
                        color: "#0c0c0d",
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add
                    </button>
                  </form>
                )}

                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}>#</th>
                      <th style={thStyle}>Team</th>
                      <th style={thStyle}>Project</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {event.teams.map((team: Team) => {
                      const ta = event.assignments.filter(
                        (a) => a.teamId === team.id,
                      );
                      const allDone =
                        ta.length > 0 &&
                        ta.every((a) => a.status === "completed");
                      const anyStarted = ta.some(
                        (a) => a.status !== "pending",
                      );
                      return (
                        <tr key={team.id}>
                          <td style={{ ...tdStyle, color: "var(--hint)" }}>
                            {team.tableNumber}
                          </td>
                          <td style={tdStyle}>{team.name}</td>
                          <td style={tdStyle}>
                            {team.projectName || "\u2014"}
                          </td>
                          <td style={tdStyle}>
                            {allDone ? (
                              <span className="pill pill-green">
                                <span className="pill-dot" /> Scored
                              </span>
                            ) : anyStarted ? (
                              <span className="pill pill-amber">
                                <span className="pill-dot" /> Pending
                              </span>
                            ) : (
                              <span className="pill pill-gray">
                                <span className="pill-dot" /> Unstarted
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => deleteTeam(team.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--hint)",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {event.teams.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            color: "var(--hint)",
                          }}
                        >
                          No teams yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Judges */}
          {activeTab === "judges" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Judges
                </h2>
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <button
                    onClick={() => setBulkJudges(!bulkJudges)}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-c)",
                      borderRadius: 8,
                      color: bulkJudges ? "#bff066" : "var(--muted-c)",
                      padding: "5px 12px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {bulkJudges ? "Single add" : "Bulk import"}
                  </button>
                </div>

                {bulkJudges ? (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 10, color: "var(--hint)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      One name per line, or comma-separated
                    </label>
                    <textarea
                      rows={6}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono, monospace)", fontSize: 12, lineHeight: 1.7 }}
                      placeholder={"Alice Johnson\nBob Smith\nCarol Lee, Dave Park"}
                      value={bulkJudgeText}
                      onChange={(e) => setBulkJudgeText(e.target.value)}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--hint)" }}>
                        {bulkJudgeText.split(/[\n,]/).filter((n) => n.trim()).length} name{bulkJudgeText.split(/[\n,]/).filter((n) => n.trim()).length !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={bulkAddJudges}
                        style={{
                          background: "#bff066",
                          border: "none",
                          borderRadius: 8,
                          color: "#0c0c0d",
                          padding: "8px 16px",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Import all
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={addJudge}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                      alignItems: "end",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Name
                      </label>
                      <input
                        style={inputStyle}
                        placeholder="Judge name"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        background: "#bff066",
                        border: "none",
                        borderRadius: 8,
                        color: "#0c0c0d",
                        padding: "8px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add judge
                    </button>
                  </form>
                )}

                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Assigned</th>
                      <th style={{ ...thStyle, width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {event.judges.map((judge: Judge) => {
                      const ja = event.assignments.filter(
                        (a) => a.judgeId === judge.id,
                      );
                      return (
                        <tr key={judge.id}>
                          <td style={tdStyle}>{judge.name}</td>
                          <td style={tdStyle}>
                            <span
                              className="code-chip"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                copyToClipboard(
                                  judge.accessCode,
                                  judge.accessCode,
                                )
                              }
                            >
                              {judge.accessCode}
                            </span>
                          </td>
                          <td style={tdStyle}>{ja.length} teams</td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => deleteJudge(judge.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--hint)",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {event.judges.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            color: "var(--hint)",
                          }}
                        >
                          No judges yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Criteria */}
          {activeTab === "criteria" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Criteria
                </h2>
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <form
                  onSubmit={addCriterion}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 72px 72px auto",
                    gap: 8,
                    marginBottom: 16,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: "var(--hint)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Name
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="Criterion"
                      value={critName}
                      onChange={(e) => setCritName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: "var(--hint)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Max
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={critMax}
                      onChange={(e) => setCritMax(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: "var(--hint)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Weight
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={critWeight}
                      onChange={(e) => setCritWeight(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      background: "#bff066",
                      border: "none",
                      borderRadius: 8,
                      color: "#0c0c0d",
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Add
                  </button>
                </form>

                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Criterion</th>
                      <th style={thStyle}>Max</th>
                      <th style={thStyle}>Weight</th>
                      <th style={{ ...thStyle, width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {event.criteria.map((c: Criterion) => (
                      <tr key={c.id}>
                        <td style={tdStyle}>{c.name}</td>
                        <td style={tdStyle}>{c.maxScore}</td>
                        <td style={tdStyle}>{c.weight}%</td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => deleteCriterion(c.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--hint)",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                    {event.criteria.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            color: "var(--hint)",
                          }}
                        >
                          No criteria yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Assignments */}
          {activeTab === "assign" && (() => {
            const minJudges = Number(judgesPerTeam) || 3;
            const teamsUnder = event.teams.filter((t) => {
              const count = event.assignments.filter((a) => a.teamId === t.id).length;
              return count < minJudges;
            });
            const judgesUnassigned = event.judges.filter(
              (j) => !event.assignments.some((a) => a.judgeId === j.id),
            );
            return (
              <>
                <div
                  style={{
                    padding: "13px 16px",
                    borderBottom: "1px solid var(--border-c)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h2
                    className="font-serif"
                    style={{ fontSize: 17, fontWeight: 200 }}
                  >
                    Assignments
                  </h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={autoAssign}
                      style={{
                        background: "#bff066",
                        color: "#0c0c0d",
                        border: "none",
                        borderRadius: 8,
                        padding: "5px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Auto-assign
                    </button>
                    {event.assignments.length > 0 && (
                      <button
                        onClick={clearAssignments}
                        style={{
                          background: "none",
                          border: "1px solid var(--border-c)",
                          borderRadius: 8,
                          padding: "5px 12px",
                          fontSize: 11,
                          color: "var(--muted-c)",
                          cursor: "pointer",
                        }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <div
                  style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
                >
                  {/* Warnings */}
                  {(teamsUnder.length > 0 || judgesUnassigned.length > 0) && (
                    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      {teamsUnder.length > 0 && (
                        <div
                          style={{
                            background: "rgba(240,200,102,.08)",
                            border: "1px solid rgba(240,200,102,.22)",
                            borderRadius: 8,
                            padding: "10px 13px",
                            fontSize: 12,
                            color: "#f0c866",
                          }}
                        >
                          <strong style={{ fontWeight: 600 }}>⚠ {teamsUnder.length} team{teamsUnder.length > 1 ? "s" : ""} below target</strong>
                          <span style={{ color: "var(--muted-c)", marginLeft: 6 }}>
                            (need {minJudges} judge{minJudges > 1 ? "s" : ""} each)
                          </span>
                          <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted-c)", lineHeight: 1.7 }}>
                            {teamsUnder.map((t) => {
                              const count = event.assignments.filter((a) => a.teamId === t.id).length;
                              return (
                                <span key={t.id} style={{ display: "inline-block", marginRight: 10 }}>
                                  <span style={{ color: "#f0c866" }}>{t.name}</span>{" "}
                                  <span style={{ color: "var(--hint)" }}>({count}/{minJudges})</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {judgesUnassigned.length > 0 && (
                        <div
                          style={{
                            background: "rgba(102,240,194,.06)",
                            border: "1px solid rgba(102,240,194,.18)",
                            borderRadius: 8,
                            padding: "10px 13px",
                            fontSize: 12,
                            color: "#66f0c2",
                          }}
                        >
                          <strong style={{ fontWeight: 600 }}>{judgesUnassigned.length} judge{judgesUnassigned.length > 1 ? "s" : ""} unassigned</strong>
                          <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted-c)" }}>
                            {judgesUnassigned.map((j) => j.name).join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual assign */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                      alignItems: "end",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Judge
                      </label>
                      <select
                        value={assignJudgeId}
                        onChange={(e) => setAssignJudgeId(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="">Select judge...</option>
                        {event.judges.map((j: Judge) => (
                          <option key={j.id} value={j.id}>
                            {j.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: "var(--hint)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Team
                      </label>
                      <select
                        value={assignTeamId}
                        onChange={(e) => setAssignTeamId(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="">Select team...</option>
                        {event.teams.map((t: Team) => (
                          <option key={t.id} value={t.id}>
                            {t.tableNumber} — {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={addManualAssignment}
                      style={{
                        background: "#bff066",
                        border: "none",
                        borderRadius: 8,
                        color: "#0c0c0d",
                        padding: "8px 14px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Assign
                    </button>
                  </div>

                  {/* Judges per team setting */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                      padding: "8px 10px",
                      background: "var(--s2)",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--muted-c)" }}>
                      Target judges per team:
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={judgesPerTeam}
                      onChange={(e) => setJudgesPerTeam(e.target.value)}
                      style={{
                        width: 50,
                        background: "var(--s3)",
                        border: "1px solid var(--border-c)",
                        borderRadius: 6,
                        color: "var(--text-c)",
                        padding: "4px 8px",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Assignment table by team */}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--hint)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 9,
                    }}
                  >
                    All assignments
                  </div>
                  {event.teams.map((team: Team) => {
                    const teamAssignments = event.assignments.filter(
                      (a) => a.teamId === team.id,
                    );
                    const count = teamAssignments.length;
                    const isUnder = count < minJudges;
                    return (
                      <div
                        key={team.id}
                        style={{
                          marginBottom: 12,
                          border: `1px solid ${isUnder ? "rgba(240,200,102,.3)" : "var(--border-c)"}`,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: isUnder ? "rgba(240,200,102,.06)" : "var(--s2)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "var(--hint)" }}>
                              {team.tableNumber}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-c)" }}>
                              {team.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 100,
                              background: isUnder
                                ? "rgba(240,200,102,.15)"
                                : count > 0
                                  ? "rgba(191,240,102,.12)"
                                  : "var(--s3)",
                              color: isUnder
                                ? "#f0c866"
                                : count > 0
                                  ? "#bff066"
                                  : "var(--hint)",
                            }}
                          >
                            {count}/{minJudges} judges
                          </span>
                        </div>
                        {teamAssignments.length > 0 ? (
                          <div style={{ padding: "0 12px 8px" }}>
                            {teamAssignments.map((a) => {
                              const judge = event.judges.find((j) => j.id === a.judgeId);
                              return (
                                <div
                                  key={a.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "6px 0",
                                    borderBottom: "1px solid rgba(42,42,47,.3)",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 12 }}>
                                      {judge?.name || "Unknown"}
                                    </span>
                                    {a.status === "completed" ? (
                                      <span className="pill pill-green" style={{ fontSize: 9 }}>
                                        <span className="pill-dot" /> Done
                                      </span>
                                    ) : a.status === "in_progress" ? (
                                      <span className="pill pill-amber" style={{ fontSize: 9 }}>
                                        <span className="pill-dot" /> Scoring
                                      </span>
                                    ) : (
                                      <span className="pill pill-gray" style={{ fontSize: 9 }}>
                                        <span className="pill-dot" /> Pending
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => deleteAssignment(a.id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--hint)",
                                      cursor: "pointer",
                                      fontSize: 13,
                                      padding: "2px 6px",
                                    }}
                                  >
                                    &times;
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "10px 12px",
                              fontSize: 11,
                              color: "var(--hint)",
                              fontStyle: "italic",
                            }}
                          >
                            No judges assigned
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {event.teams.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--hint)",
                        fontSize: 12,
                        padding: 20,
                      }}
                    >
                      Add teams and judges first
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Share */}
          {activeTab === "share" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Share Links
                </h2>
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                  }}
                >
                  Judge links
                </div>
                {event.judges.map((judge: Judge) => (
                  <div
                    key={judge.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(42,42,47,.5)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12 }}>{judge.name}</span>
                      <span className="code-chip" style={{ marginLeft: 8 }}>
                        {judge.accessCode}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${getBaseUrl()}/event/${eventId}/judge/${judge.accessCode}`,
                          `${judge.name} link`,
                        )
                      }
                      style={{
                        background: "none",
                        border: "1px solid var(--border-c)",
                        borderRadius: 8,
                        color: "var(--muted-c)",
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                ))}

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                    marginTop: 20,
                  }}
                >
                  Team links
                </div>
                {event.teams.map((team: Team) => (
                  <div
                    key={team.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(42,42,47,.5)",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--hint)",
                          marginRight: 8,
                        }}
                      >
                        {team.tableNumber}
                      </span>
                      <span style={{ fontSize: 12 }}>{team.name}</span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${getBaseUrl()}/event/${eventId}/team/${team.tableNumber}`,
                          `${team.name} link`,
                        )
                      }
                      style={{
                        background: "none",
                        border: "1px solid var(--border-c)",
                        borderRadius: 8,
                        color: "var(--muted-c)",
                        padding: "4px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-c)",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: 17, fontWeight: 200 }}
                >
                  Settings
                </h2>
              </div>
              <div
                style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                  }}
                >
                  Event details
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--hint)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Event name
                  </label>
                  <input
                    style={inputStyle}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--hint)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    style={{
                      ...inputStyle,
                      resize: "none",
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                    marginTop: 24,
                  }}
                >
                  Judging timer
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: "var(--hint)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    style={{ ...inputStyle, width: 120 }}
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 4 }}>
                    Set to 0 for unlimited (shows elapsed time only)
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 9,
                    marginTop: 24,
                  }}
                >
                  Info
                </div>
                <div
                  style={{
                    background: "var(--s2)",
                    borderRadius: 8,
                    padding: "10px 13px",
                    fontSize: 12,
                    color: "var(--muted-c)",
                    marginBottom: 20,
                  }}
                >
                  <div>Event ID: <span className="code-chip">{eventId}</span></div>
                  <div style={{ marginTop: 6 }}>
                    Created: {new Date(event.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={updateEventSettings}
                  style={{
                    background: "#bff066",
                    color: "#0c0c0d",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 20px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
