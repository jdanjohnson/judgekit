"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  ArrowLeft,
  Hash,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { EventData, Assignment } from "@/lib/types";
import { safeFetch } from "@/lib/fetch";

export default function TeamView() {
  const params = useParams();
  const router = useRouter();
  const tableNumber = decodeURIComponent(params.tableNumber as string);

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvent = useCallback(async () => {
    try {
      const res = await safeFetch("/api/event");
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setError("");
        const team = data.teams.find(
          (t: { tableNumber: string }) => t.tableNumber === tableNumber
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
  }, [tableNumber]);

  useEffect(() => {
    fetchEvent();
    const interval = setInterval(fetchEvent, 15000);
    return () => clearInterval(interval);
  }, [fetchEvent]);

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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) return null;

  const team = event.teams.find((t) => t.tableNumber === tableNumber);
  if (!team) return null;

  const teamAssignments = event.assignments.filter(
    (a) => a.teamId === team.id
  );
  const completedCount = teamAssignments.filter(
    (a) => a.status === "completed"
  ).length;
  const progressPercent =
    teamAssignments.length > 0
      ? Math.round((completedCount / teamAssignments.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
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
            <p className="text-xs text-muted-foreground">Team View</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-2xl px-4 py-2">
                <Hash className="h-5 w-5 mr-1" />
                {team.tableNumber}
              </Badge>
              <div>
                <CardTitle>{team.name}</CardTitle>
                {team.projectName && (
                  <CardDescription>{team.projectName}</CardDescription>
                )}
              </div>
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {team.description}
              </p>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Judging Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {teamAssignments.length} judges done
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        <h2 className="font-semibold text-lg">Assigned Judges</h2>

        {teamAssignments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No judges assigned yet. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          teamAssignments.map((assignment: Assignment) => {
            const assignedJudge = event.judges.find(
              (j) => j.id === assignment.judgeId
            );
            if (!assignedJudge) return null;
            return (
              <Card key={assignment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assignedJudge.name}</p>
                        <p className="text-xs text-muted-foreground">Judge</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.status === "completed" ? (
                        <Badge className="bg-green-600 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </Badge>
                      ) : assignment.status === "in_progress" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" /> In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <p className="text-xs text-center text-muted-foreground mt-4">
          This page auto-refreshes every 15 seconds.
        </p>
      </main>
    </div>
  );
}
