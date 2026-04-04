"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  Check,
  Hash,
  Star,
} from "lucide-react";
import { EventData, Assignment, Team, Criterion } from "@/lib/types";
import { safeFetch } from "@/lib/fetch";

export default function JudgePortal() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await safeFetch("/api/event");
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        const judge = data.judges.find(
          (j: { accessCode: string }) => j.accessCode === code
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
  }, [code]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const judge = event?.judges.find((j) => j.accessCode === code);
  const myAssignments = event?.assignments.filter(
    (a) => a.judgeId === judge?.id
  ) || [];
  const completedCount = myAssignments.filter(
    (a) => a.status === "completed"
  ).length;

  function startScoring(index: number) {
    const assignment = myAssignments[index];
    if (!assignment) return;
    setActiveTeamIndex(index);
    const existingScores: Record<string, number> = {};
    for (const s of assignment.scores) {
      existingScores[s.criterionId] = s.value;
    }
    setScores(existingScores);
    setNotes(assignment.notes);
  }

  function setScore(criterionId: string, value: number) {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }

  async function saveScores(complete: boolean) {
    if (activeTeamIndex === null || !event) return;
    const assignment = myAssignments[activeTeamIndex];
    if (!assignment) return;

    setSaving(true);
    try {
      const scoreArray = Object.entries(scores).map(
        ([criterionId, value]) => ({ criterionId, value })
      );
      const res = await safeFetch("/api/assignments", {
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
        if (complete && activeTeamIndex < myAssignments.length - 1) {
          startScoring(activeTeamIndex + 1);
        } else if (complete) {
          setActiveTeamIndex(null);
        }
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Connection error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event || !judge) return null;

  const progressPercent =
    myAssignments.length > 0
      ? Math.round((completedCount / myAssignments.length) * 100)
      : 0;

  // Scoring view
  if (activeTeamIndex !== null) {
    const assignment = myAssignments[activeTeamIndex];
    const team = event.teams.find((t) => t.id === assignment.teamId);
    if (!team) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setActiveTeamIndex(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Button>
            <Badge>
              {activeTeamIndex + 1} of {myAssignments.length}
            </Badge>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Table {team.tableNumber} — {team.name}
                  </CardTitle>
                  {team.projectName && (
                    <CardDescription className="mt-1">
                      {team.projectName}
                    </CardDescription>
                  )}
                </div>
                <Badge
                  variant={
                    assignment.status === "completed" ? "default" : "secondary"
                  }
                >
                  {assignment.status}
                </Badge>
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {team.description}
                </p>
              )}
            </CardHeader>
          </Card>

          {event.criteria.map((criterion: Criterion) => (
            <Card key={criterion.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{criterion.name}</h3>
                    {criterion.description && (
                      <p className="text-sm text-muted-foreground">
                        {criterion.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {scores[criterion.id] ?? "—"} / {criterion.maxScore}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from(
                    { length: criterion.maxScore },
                    (_, i) => i + 1
                  ).map((value) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={
                        scores[criterion.id] === value ? "default" : "outline"
                      }
                      onClick={() => setScore(criterion.id, value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="pt-6">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any feedback or notes for this team..."
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={() => saveScores(false)}
              disabled={saving}
            >
              Save Draft
            </Button>
            <div className="flex gap-3">
              {activeTeamIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={() => startScoring(activeTeamIndex - 1)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
              )}
              <Button
                onClick={() => saveScores(true)}
                disabled={saving}
                className="gap-2"
              >
                <Check className="h-4 w-4" />{" "}
                {activeTeamIndex < myAssignments.length - 1
                  ? "Submit & Next"
                  : "Submit"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Assignment list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold">{event.name}</h1>
              <p className="text-xs text-muted-foreground">
                Judge: {judge.name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono">
            {code}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" /> Your Progress
              </span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {myAssignments.length} complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {myAssignments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No teams assigned yet. The event organizer will assign teams to
                you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="font-semibold text-lg">Your Assigned Teams</h2>
            {myAssignments.map((assignment: Assignment, index: number) => {
              const team = event.teams.find(
                (t: Team) => t.id === assignment.teamId
              );
              if (!team) return null;
              return (
                <Card
                  key={assignment.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => startScoring(index)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-lg px-3">
                          #{team.tableNumber}
                        </Badge>
                        <div>
                          <h3 className="font-medium">{team.name}</h3>
                          {team.projectName && (
                            <p className="text-sm text-muted-foreground">
                              {team.projectName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            assignment.status === "completed"
                              ? "default"
                              : assignment.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            assignment.status === "completed"
                              ? "bg-green-600"
                              : ""
                          }
                        >
                          {assignment.status === "completed"
                            ? "Done"
                            : assignment.status === "in_progress"
                            ? "In Progress"
                            : "Pending"}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        <Separator />
        <p className="text-xs text-center text-muted-foreground">
          Browse all your assigned teams above. Tap any team to start or
          continue scoring.
        </p>
      </main>
    </div>
  );
}
