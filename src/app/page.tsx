"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [eventIdForAdmin, setEventIdForAdmin] = useState("");

  async function handleEnter() {
    const v = code.trim().toUpperCase();
    if (!v) return;
    setError("");
    setLoading(true);

    if (v === "ADMIN") {
      setShowPin(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/lookup?code=${encodeURIComponent(v)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.type === "judge") {
          router.push(`/event/${data.eventId}/judge/${data.code}`);
        } else if (data.type === "team") {
          router.push(`/event/${data.eventId}/team/${data.tableNumber}`);
        }
      } else {
        setError("Code not found. Double-check with your organizer.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  }

  async function handleAdminLogin() {
    if (!eventIdForAdmin.trim() || !pin.trim()) {
      setError("Enter both event ID and PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin?eventId=${encodeURIComponent(eventIdForAdmin.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );
      if (res.ok) {
        sessionStorage.setItem("adminPin", pin);
        router.push(
          `/event/${encodeURIComponent(eventIdForAdmin.trim())}/admin`
        );
      } else {
        const data = await res.json();
        setError(
          res.status === 404
            ? "No event found with that ID."
            : data.error || "Invalid PIN."
        );
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  }

  // Shared top bar
  const bar = (
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
      {showPin && (
        <button
          className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{
            color: "var(--muted-c)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => {
            setShowPin(false);
            setPin("");
            setEventIdForAdmin("");
            setError("");
          }}
        >
          &larr; back
        </button>
      )}
    </div>
  );

  // Admin gate
  if (showPin) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--bg)" }}
      >
        {bar}
        <div
          className="flex-1 flex items-start justify-center"
          style={{ paddingTop: 40 }}
        >
          <div style={{ maxWidth: 400, width: "100%", padding: "0 24px" }}>
            <div
              className="font-serif text-center"
              style={{
                fontSize: 26,
                fontWeight: 200,
                marginBottom: 6,
                color: "var(--text-c)",
              }}
            >
              Admin access
            </div>
            <div
              className="text-center"
              style={{
                fontSize: 12,
                color: "var(--muted-c)",
                marginBottom: 22,
              }}
            >
              Enter your event ID and admin PIN.
            </div>

            <input
              className="w-full"
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border-c)",
                borderRadius: 12,
                color: "var(--text-c)",
                padding: "12px 18px",
                fontSize: 14,
                letterSpacing: "0.08em",
                textAlign: "center",
                outline: "none",
                marginBottom: 10,
              }}
              placeholder="Event ID"
              value={eventIdForAdmin}
              onChange={(e) => setEventIdForAdmin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  document.getElementById("pin-input")?.focus();
              }}
            />

            <input
              id="pin-input"
              className="w-full"
              type="password"
              maxLength={4}
              style={{
                background: "var(--s1)",
                border: "1px solid var(--border-c)",
                borderRadius: 12,
                color: "var(--text-c)",
                padding: "14px 18px",
                fontSize: 22,
                letterSpacing: "0.3em",
                textAlign: "center",
                outline: "none",
              }}
              placeholder="\u00b7\u00b7\u00b7\u00b7"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdminLogin();
              }}
            />

            {error && (
              <div
                style={{
                  background: "rgba(240,112,112,.1)",
                  border: "1px solid rgba(240,112,112,.22)",
                  borderRadius: 8,
                  color: "#f07070",
                  fontSize: 12,
                  padding: "9px 13px",
                  marginTop: 10,
                }}
              >
                {error}
              </div>
            )}

            <button
              className="w-full"
              disabled={loading}
              style={{
                background: "#bff066",
                color: "#0c0c0d",
                border: "none",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                fontWeight: 500,
                marginTop: 10,
                letterSpacing: "0.02em",
                cursor: "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              onClick={handleAdminLogin}
            >
              {loading ? "Checking..." : "Enter dashboard"}
            </button>

          </div>
        </div>
      </div>
    );
  }

  // Main entry
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {bar}
      <div
        className="flex-1 flex items-start justify-center"
        style={{ paddingTop: 56 }}
      >
        <div style={{ maxWidth: 400, width: "100%", padding: "0 24px" }}>
          <div
            className="text-center uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--hint)",
              marginBottom: 18,
            }}
          >
            Hackathon judging
          </div>
          <div
            className="font-serif text-center"
            style={{
              fontSize: 34,
              fontWeight: 200,
              lineHeight: 1.1,
              marginBottom: 6,
              color: "var(--text-c)",
            }}
          >
            Welcome.
            <br />
            Enter your{" "}
            <em className="text-lime" style={{ fontStyle: "italic" }}>
              code.
            </em>
          </div>
          <div
            className="text-center"
            style={{
              fontSize: 12,
              color: "var(--muted-c)",
              marginBottom: 30,
              lineHeight: 1.7,
            }}
          >
            Judges and teams each receive a unique code from their organizer.
            Enter yours to get started.
          </div>

          <input
            className="w-full"
            maxLength={6}
            autoComplete="off"
            style={{
              background: "var(--s1)",
              border: "1px solid var(--border-c)",
              borderRadius: 12,
              color: "var(--text-c)",
              padding: "14px 18px",
              fontSize: 17,
              letterSpacing: "0.18em",
              textAlign: "center",
              textTransform: "uppercase",
              outline: "none",
            }}
            placeholder="\u00b7 \u00b7 \u00b7 \u00b7 \u00b7 \u00b7"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEnter();
            }}
          />

          {error && (
            <div
              style={{
                background: "rgba(240,112,112,.1)",
                border: "1px solid rgba(240,112,112,.22)",
                borderRadius: 8,
                color: "#f07070",
                fontSize: 12,
                padding: "9px 13px",
                marginTop: 10,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="w-full"
            disabled={loading}
            style={{
              background: "#bff066",
              color: "#0c0c0d",
              border: "none",
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              fontWeight: 500,
              marginTop: 10,
              letterSpacing: "0.02em",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
            onClick={handleEnter}
          >
            {loading ? "Looking up..." : "Continue"}
          </button>

          <div
            className="text-center"
            style={{
              fontSize: 10,
              color: "var(--hint)",
              marginTop: 12,
              lineHeight: 1.8,
            }}
          >
            Organizers:{" "}
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-c)",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 10,
              }}
              onClick={() => setShowPin(true)}
            >
              admin panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
