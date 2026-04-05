"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface JudgeSummary {
  id: string;
  name: string;
  accessCode: string;
}

interface TeamSummary {
  id: string;
  name: string;
  tableNumber: string;
  projectName: string;
}

interface EventSummary {
  id: string;
  name: string;
  description: string;
  adminPin: string;
  eventDate: string;
  createdAt: string;
  teamCount: number;
  judgeCount: number;
  assignmentCount: number;
  judgingStatus: string;
  judges: JudgeSummary[];
  teams: TeamSummary[];
}

export default function MasterAdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [masterSecret, setMasterSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");

  const fetchEvents = useCallback(async (secret?: string, opts?: { isExplicitAuth?: boolean }) => {
    const s = secret ?? sessionStorage.getItem("masterAdminSecret") ?? "";
    try {
      const res = await fetch("/api/admin-list", {
        headers: s ? { "x-admin-secret": s } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        setAuthenticated(true);
      } else if (res.status === 401) {
        setAuthenticated(false);
        if (opts?.isExplicitAuth) {
          setAuthError("Invalid secret");
          sessionStorage.removeItem("masterAdminSecret");
        }
      } else {
        toast.error("Failed to load events");
      }
    } catch {
      toast.error("Connection error");
    }
    setLoading(false);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    fetchEvents(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch
  }, [fetchEvents]);

  function handleAuth() {
    if (!masterSecret.trim()) {
      setAuthError("Secret is required");
      return;
    }
    setAuthError("");
    sessionStorage.setItem("masterAdminSecret", masterSecret.trim());
    setLoading(true);
    fetchEvents(masterSecret.trim(), { isExplicitAuth: true });
  }

  function togglePin(id: string) {
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleExpand(id: string) {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function openAdmin(ev: EventSummary) {
    try {
      const res = await fetch(
        `/api/admin?eventId=${encodeURIComponent(ev.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: ev.adminPin }),
        }
      );
      if (res.ok) {
        sessionStorage.setItem("adminPin", ev.adminPin);
        router.push(`/event/${ev.id}/admin`);
      } else {
        toast.error("Failed to verify event PIN");
      }
    } catch {
      toast.error("Connection error");
    }
  }

  function startEditDate(ev: EventSummary) {
    setEditingDate(ev.id);
    setEditDateValue(ev.eventDate ? ev.eventDate.slice(0, 10) : "");
  }

  async function saveDate(eventId: string) {
    const s = sessionStorage.getItem("masterAdminSecret") ?? "";
    const pin = events.find((e) => e.id === eventId)?.adminPin ?? "";
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(s ? { "x-admin-secret": s } : {}),
          ...(pin ? { "x-admin-pin": pin } : {}),
        },
        body: JSON.stringify({ eventDate: editDateValue || "" }),
      });
      if (res.ok) {
        toast.success("Date updated");
        setEditingDate(null);
        fetchEvents();
      } else {
        toast.error("Failed to update date");
      }
    } catch {
      toast.error("Connection error");
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    const s = sessionStorage.getItem("masterAdminSecret") ?? "";
    try {
      const pin = events.find((e) => e.id === id)?.adminPin ?? "";
      const res = await fetch(`/api/event?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          ...(s ? { "x-admin-secret": s } : {}),
          ...(pin ? { "x-admin-pin": pin } : {}),
        },
      });
      if (res.ok) {
        toast.success("Event deleted");
        fetchEvents();
      } else {
        toast.error("Failed to delete event");
      }
    } catch {
      toast.error("Connection error");
    }
  }

  function getBaseUrl() {
    return typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${label}`);
  }

  const statusColor: Record<string, string> = {
    active: "#bff066",
    stopped: "#f0c866",
    idle: "var(--muted-c)",
  };

  const statusLabel: Record<string, string> = {
    active: "Judging",
    stopped: "Stopped",
    idle: "Idle",
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

  // Create event state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPin, setNewPin] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!newPin || newPin.length < 4) {
      toast.error("Admin PIN must be at least 4 digits");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          adminPin: newPin,
        }),
      });
      if (res.ok) {
        toast.success("Event created!");
        setNewName("");
        setNewDesc("");
        setNewPin("");
        setShowCreate(false);
        fetchEvents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create event");
      }
    } catch {
      toast.error("Connection error");
    }
    setCreating(false);
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
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-c)",
              marginLeft: 10,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            admin
          </span>
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
          &larr; home
        </button>
      </div>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "28px 24px",
          width: "100%",
        }}
      >
        {/* Auth gate — shown when MASTER_ADMIN_SECRET is set and user hasn't authenticated */}
        {authChecked && !authenticated && !loading && (
          <div style={{ maxWidth: 360, margin: "60px auto", textAlign: "center" }}>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 200, marginBottom: 6 }}>
              Master Admin
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-c)", marginBottom: 20 }}>
              Enter the admin secret to continue
            </div>
            <input
              type="password"
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="Admin secret..."
              value={masterSecret}
              onChange={(e) => setMasterSecret(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
            />
            {authError && (
              <div style={{ fontSize: 11, color: "#f07070", marginBottom: 8 }}>{authError}</div>
            )}
            <button
              onClick={handleAuth}
              style={{
                background: "#bff066",
                color: "#0c0c0d",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Enter
            </button>
          </div>
        )}

        {/* Main content — only shown when authenticated */}
        {authenticated && <>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              className="font-serif"
              style={{ fontSize: 26, fontWeight: 200, lineHeight: 1.1 }}
            >
              Events
            </div>
            <div
              style={{ fontSize: 12, color: "var(--muted-c)", marginTop: 4 }}
            >
              {events.length} event{events.length !== 1 ? "s" : ""} total
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              background: showCreate ? "none" : "#bff066",
              color: showCreate ? "var(--muted-c)" : "#0c0c0d",
              border: showCreate
                ? "1px solid var(--border-c)"
                : "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {showCreate ? "Cancel" : "+ New event"}
          </button>
        </div>

        {/* Quick create form */}
        {showCreate && (
          <div
            style={{
              background: "var(--s1)",
              border: "1px solid var(--border-c)",
              borderRadius: 12,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--hint)",
                marginBottom: 12,
              }}
            >
              Quick create
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px",
                gap: 10,
                marginBottom: 10,
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
                  Event name
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. HackMIT 2025"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
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
                  Description (optional)
                </label>
                <input
                  style={inputStyle}
                  placeholder="Brief description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
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
                  Admin PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  style={inputStyle}
                  placeholder="····"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                disabled={creating}
                onClick={handleCreate}
                style={{
                  background: "#bff066",
                  color: "#0c0c0d",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "Creating..." : "Create event"}
              </button>
            </div>
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted-c)",
              fontSize: 13,
            }}
          >
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "var(--muted-c)",
              fontSize: 13,
            }}
          >
            No events yet. Click &ldquo;+ New event&rdquo; to create one.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {events.map((ev) => {
              const isExpanded = expandedEvents[ev.id];
              const base = getBaseUrl();
              return (
              <div
                key={ev.id}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--border-c)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Event header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "14px 18px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleExpand(ev.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--hint)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", display: "inline-block" }}>&#9654;</span>
                      <span
                        className="font-serif"
                        style={{
                          fontSize: 16,
                          fontWeight: 200,
                          color: "var(--text-c)",
                        }}
                      >
                        {ev.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 20,
                          background: `${statusColor[ev.judgingStatus] ?? "var(--muted-c)"}22`,
                          color:
                            statusColor[ev.judgingStatus] ?? "var(--muted-c)",
                          fontWeight: 500,
                        }}
                      >
                        {statusLabel[ev.judgingStatus] ?? "Idle"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 11,
                        color: "var(--hint)",
                        marginLeft: 22,
                      }}
                    >
                      <span>
                        {ev.teamCount} team{ev.teamCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {ev.judgeCount} judge{ev.judgeCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {ev.eventDate ? new Date(ev.eventDate + "T00:00:00").toLocaleDateString() : "No date set"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openAdmin(ev)}
                      style={{
                        background: "#bff066",
                        color: "#0c0c0d",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border-c)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 11,
                        color: "#f07070",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-c)", padding: "14px 18px" }}>
                    {/* Event info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Event ID</div>
                        <button onClick={() => copyToClipboard(ev.id, "Event ID")} style={{ background: "none", border: "none", color: "var(--text-c)", fontSize: 13, fontFamily: "var(--font-mono, monospace)", cursor: "pointer", padding: 0 }} title="Click to copy">
                          {ev.id}
                        </button>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Admin PIN</div>
                        <button
                          onClick={() => togglePin(ev.id)}
                          style={{ background: "none", border: "none", color: showPins[ev.id] ? "#bff066" : "var(--text-c)", fontSize: 13, fontFamily: "var(--font-mono, monospace)", cursor: "pointer", padding: 0 }}
                        >
                          {showPins[ev.id] ? ev.adminPin : "····"}
                        </button>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Event Date</div>
                        {editingDate === ev.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="date"
                              value={editDateValue}
                              onChange={(e) => setEditDateValue(e.target.value)}
                              style={{ ...inputStyle, width: 150, padding: "4px 8px", fontSize: 12 }}
                            />
                            <button onClick={() => saveDate(ev.id)} style={{ background: "#bff066", color: "#0c0c0d", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditingDate(null)} style={{ background: "none", border: "1px solid var(--border-c)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--hint)", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditDate(ev)} style={{ background: "none", border: "none", color: "var(--text-c)", fontSize: 13, cursor: "pointer", padding: 0 }} title="Click to edit">
                            {ev.eventDate ? new Date(ev.eventDate + "T00:00:00").toLocaleDateString() : "—"}
                            <span style={{ fontSize: 10, color: "var(--hint)", marginLeft: 6 }}>edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Admin URL</div>
                        <button onClick={() => copyToClipboard(`${base}/event/${ev.id}/admin`, "Admin URL")} style={{ background: "none", border: "none", color: "#66f0c2", fontSize: 11, fontFamily: "var(--font-mono, monospace)", cursor: "pointer", padding: 0, wordBreak: "break-all", textAlign: "left" }}>
                          {base}/event/{ev.id}/admin
                        </button>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Created</div>
                        <span style={{ fontSize: 13, color: "var(--muted-c)" }}>{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Judges table */}
                    {ev.judges.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Judges &amp; Access Codes</div>
                        <div style={{ background: "var(--s2)", borderRadius: 8, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-c)" }}>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Name</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Access Code</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Judge URL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ev.judges.map((j) => (
                                <tr key={j.id} style={{ borderBottom: "1px solid var(--border-c)" }}>
                                  <td style={{ padding: "6px 10px", color: "var(--text-c)" }}>{j.name}</td>
                                  <td style={{ padding: "6px 10px" }}>
                                    <button onClick={() => copyToClipboard(j.accessCode, `Code for ${j.name}`)} style={{ background: "none", border: "none", color: "#bff066", fontFamily: "var(--font-mono, monospace)", fontSize: 12, cursor: "pointer", padding: 0 }}>
                                      {j.accessCode}
                                    </button>
                                  </td>
                                  <td style={{ padding: "6px 10px" }}>
                                    <button onClick={() => copyToClipboard(`${base}/event/${ev.id}/judge/${j.accessCode}`, `URL for ${j.name}`)} style={{ background: "none", border: "none", color: "#66f0c2", fontFamily: "var(--font-mono, monospace)", fontSize: 11, cursor: "pointer", padding: 0 }}>
                                      copy link
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Teams table */}
                    {ev.teams.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--hint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Teams &amp; Table Numbers</div>
                        <div style={{ background: "var(--s2)", borderRadius: 8, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-c)" }}>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Team</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Table #</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Project</th>
                                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--hint)", fontWeight: 400, fontSize: 10, textTransform: "uppercase" }}>Team URL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ev.teams.map((t) => (
                                <tr key={t.id} style={{ borderBottom: "1px solid var(--border-c)" }}>
                                  <td style={{ padding: "6px 10px", color: "var(--text-c)" }}>{t.name}</td>
                                  <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono, monospace)", color: "#bff066" }}>{t.tableNumber}</td>
                                  <td style={{ padding: "6px 10px", color: "var(--muted-c)" }}>{t.projectName || "—"}</td>
                                  <td style={{ padding: "6px 10px" }}>
                                    <button onClick={() => copyToClipboard(`${base}/event/${ev.id}/team/${t.tableNumber}`, `URL for ${t.name}`)} style={{ background: "none", border: "none", color: "#66f0c2", fontFamily: "var(--font-mono, monospace)", fontSize: 11, cursor: "pointer", padding: 0 }}>
                                      copy link
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {ev.judges.length === 0 && ev.teams.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted-c)", fontStyle: "italic" }}>
                        No judges or teams added yet. Open the event admin to get started.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
