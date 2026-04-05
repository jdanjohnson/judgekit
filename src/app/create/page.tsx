"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CriterionDraft {
  name: string;
  maxScore: string;
  weight: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");

  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    { name: "Innovation", maxScore: "10", weight: "30" },
    { name: "Execution", maxScore: "10", weight: "30" },
    { name: "Impact", maxScore: "10", weight: "25" },
    { name: "Presentation", maxScore: "10", weight: "15" },
  ]);

  const [adminPin, setAdminPin] = useState("");

  function addCriterion() {
    setCriteria([...criteria, { name: "", maxScore: "10", weight: "0" }]);
  }

  function removeCriterion(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  function updateCriterion(
    index: number,
    field: keyof CriterionDraft,
    value: string,
  ) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  }

  async function handleCreate() {
    if (!eventName.trim()) {
      toast.error("Event name is required");
      setStep(1);
      return;
    }
    if (!adminPin || adminPin.length < 4) {
      toast.error("Admin PIN must be at least 4 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventName.trim(),
          description: eventDesc.trim(),
          adminPin,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create event");
        setLoading(false);
        return;
      }
      const eventData = await res.json();
      const eventId = eventData.id;
      const eq = `eventId=${encodeURIComponent(eventId)}`;

      for (const c of criteria) {
        if (!c.name.trim()) continue;
        await fetch(`/api/criteria?${eq}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: c.name.trim(),
            description: "",
            maxScore: Number(c.maxScore) || 10,
            weight: Number(c.weight) || 1,
          }),
        });
      }

      sessionStorage.setItem("adminPin", adminPin);
      toast.success("Event created!");
      router.push(`/event/${eventId}/admin`);
    } catch {
      toast.error("Connection error");
    }
    setLoading(false);
  }

  const stepNames = ["Details", "Criteria", "Settings"];

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
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "var(--muted-c)",
    marginBottom: 5,
  };

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
        className="flex-1"
        style={{
          maxWidth: 580,
          margin: "0 auto",
          padding: "28px 24px",
          width: "100%",
        }}
      >
        {/* Step bar */}
        <div className="flex items-center" style={{ marginBottom: 28 }}>
          {stepNames.map((name, i) => {
            const n = i + 1;
            const isDone = step > n;
            const isActive = step === n;
            return (
              <div key={n} className="contents">
                {i > 0 && (
                  <div
                    className="flex-1"
                    style={{
                      height: 1,
                      background: "var(--border-c)",
                      margin: "0 10px",
                    }}
                  />
                )}
                <div
                  className="flex items-center gap-2"
                  style={{ fontSize: 12 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 500,
                      flexShrink: 0,
                      ...(isDone
                        ? { background: "#bff066", color: "#0c0c0d" }
                        : isActive
                          ? {
                              background: "var(--s3)",
                              border: "1px solid var(--border2)",
                              color: "var(--text-c)",
                            }
                          : {
                              background: "none",
                              border: "1px solid var(--border-c)",
                              color: "var(--hint)",
                            }),
                    }}
                  >
                    {isDone ? "\u2713" : n}
                  </div>
                  <span
                    style={{
                      color: isActive
                        ? "var(--text-c)"
                        : isDone
                          ? "var(--muted-c)"
                          : "var(--hint)",
                    }}
                  >
                    {name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div>
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--hint)",
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border-c)",
              }}
            >
              Event details
            </div>
            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Event name</label>
              <input
                style={inputStyle}
                placeholder="e.g. Miami Hack Week Spring 2025"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea
                rows={3}
                style={{ ...inputStyle, resize: "none" }}
                placeholder="Brief description..."
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
              />
            </div>
            <div
              className="flex justify-end"
              style={{
                paddingTop: 18,
                borderTop: "1px solid var(--border-c)",
                marginTop: 4,
              }}
            >
              <button
                style={{
                  background: "#bff066",
                  color: "#0c0c0d",
                  border: "none",
                  padding: "9px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (!eventName.trim()) {
                    toast.error("Event name is required");
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Criteria */}
        {step === 2 && (
          <div>
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--hint)",
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border-c)",
              }}
            >
              Scoring criteria
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 72px 72px 32px",
                gap: 8,
                marginBottom: 5,
              }}
            >
              {["Criterion", "Max", "Weight %", ""].map((h, i) => (
                <span
                  key={i}
                  className="uppercase"
                  style={{
                    fontSize: 10,
                    color: "var(--hint)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                marginBottom: 9,
              }}
            >
              {criteria.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 72px 72px 32px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    style={{ ...inputStyle, padding: "7px 9px", fontSize: 12 }}
                    placeholder="Criterion"
                    value={c.name}
                    onChange={(e) => updateCriterion(i, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    style={{ ...inputStyle, padding: "7px 9px", fontSize: 12 }}
                    value={c.maxScore}
                    onChange={(e) =>
                      updateCriterion(i, "maxScore", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    style={{ ...inputStyle, padding: "7px 9px", fontSize: 12 }}
                    value={c.weight}
                    onChange={(e) =>
                      updateCriterion(i, "weight", e.target.value)
                    }
                  />
                  <button
                    onClick={() => removeCriterion(i)}
                    style={{
                      width: 32,
                      height: 32,
                      background: "none",
                      border: "1px solid var(--border-c)",
                      borderRadius: 8,
                      color: "var(--muted-c)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCriterion}
              style={{
                width: "100%",
                background: "none",
                border: "1px dashed var(--border2)",
                borderRadius: 8,
                color: "var(--muted-c)",
                padding: 7,
                fontSize: 12,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              + Add criterion
            </button>
            <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 10 }}>
              Weights should total 100%.
            </div>
            <div
              className="flex justify-between items-center"
              style={{
                paddingTop: 18,
                borderTop: "1px solid var(--border-c)",
                marginTop: 4,
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "1px solid var(--border-c)",
                  color: "var(--muted-c)",
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onClick={() => setStep(1)}
              >
                &larr; Back
              </button>
              <button
                style={{
                  background: "#bff066",
                  color: "#0c0c0d",
                  border: "none",
                  padding: "9px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                onClick={() => setStep(3)}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div>
            <div
              className="uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--hint)",
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border-c)",
              }}
            >
              Admin settings
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 11,
              }}
            >
              <div style={{ marginBottom: 13 }}>
                <label style={labelStyle}>Admin PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength={4}
                  style={inputStyle}
                  placeholder={"\u00b7\u00b7\u00b7\u00b7"}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <div
                  style={{ fontSize: 11, color: "var(--hint)", marginTop: 4 }}
                >
                  Protects your dashboard.
                </div>
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={labelStyle}>Judge assignment</label>
                <select style={inputStyle}>
                  <option>Distribute evenly</option>
                  <option>Manual only</option>
                  <option>Round-robin</option>
                </select>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 11,
              }}
            >
              <div style={{ marginBottom: 13 }}>
                <label style={labelStyle}>Teams can see scores</label>
                <select style={inputStyle}>
                  <option>After all judging is complete</option>
                  <option>As each judge finishes</option>
                  <option>Never — admin only</option>
                </select>
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={labelStyle}>Judge notes</label>
                <select style={inputStyle}>
                  <option>Visible to admin only</option>
                  <option>Visible to teams too</option>
                  <option>Disabled</option>
                </select>
              </div>
            </div>
            <div
              style={{
                background: "var(--s2)",
                border: "1px solid var(--border-c)",
                borderRadius: 8,
                padding: "13px 15px",
                marginBottom: 20,
              }}
            >
              <div
                className="uppercase"
                style={{
                  fontSize: 11,
                  color: "#bff066",
                  letterSpacing: "0.07em",
                  marginBottom: 6,
                }}
              >
                Ready to launch
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-c)",
                  lineHeight: 1.7,
                }}
              >
                Judges get personal 6-character codes. Teams get table-number
                codes. Your admin dashboard is accessible only via PIN.
              </div>
            </div>
            <div
              className="flex justify-between items-center"
              style={{
                paddingTop: 18,
                borderTop: "1px solid var(--border-c)",
                marginTop: 4,
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "1px solid var(--border-c)",
                  color: "var(--muted-c)",
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onClick={() => setStep(2)}
              >
                &larr; Back
              </button>
              <button
                disabled={loading}
                style={{
                  background: "#bff066",
                  color: "#0c0c0d",
                  border: "none",
                  padding: "9px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
                onClick={handleCreate}
              >
                {loading ? "Creating..." : "Create event \u2192"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
