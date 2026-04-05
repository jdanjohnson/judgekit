"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EventSummary {
  id: string;
  name: string;
  description: string;
  adminPin: string;
  createdAt: string;
  teamCount: number;
  judgeCount: number;
  assignmentCount: number;
  judgingStatus: string;
}

export default function MasterAdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [masterSecret, setMasterSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");

  const fetchEvents = useCallback(async (secret?: string) => {
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
    fetchEvents(masterSecret.trim());
  }

  function togglePin(id: string) {
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openAdmin(event: EventSummary) {
    sessionStorage.setItem("adminPin", event.adminPin);
    router.push(`/event/${event.id}/admin`);
  }

  async function deleteEvent(id: string) {
    try {
      const res = await fetch(`/api/event?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
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
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--border-c)",
                  borderRadius: 12,
                  padding: "14px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
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
                    {ev.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted-c)",
                          marginBottom: 6,
                        }}
                      >
                        {ev.description}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 11,
                        color: "var(--hint)",
                      }}
                    >
                      <span>
                        ID:{" "}
                        <span style={{ color: "var(--muted-c)" }}>
                          {ev.id}
                        </span>
                      </span>
                      <span>
                        PIN:{" "}
                        <button
                          onClick={() => togglePin(ev.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: showPins[ev.id]
                              ? "#bff066"
                              : "var(--muted-c)",
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          {showPins[ev.id] ? ev.adminPin : "····"}
                        </button>
                      </span>
                      <span>
                        {ev.teamCount} team{ev.teamCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {ev.judgeCount} judge{ev.judgeCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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
                        color: "var(--hint)",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
