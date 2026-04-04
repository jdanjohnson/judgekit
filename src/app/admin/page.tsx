"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { safeFetch } from "@/lib/fetch";
import {
  ClipboardList,
  Plus,
  Trash2,
  Users,
  Award,
  Target,
  Download,
  Shuffle,
  ArrowLeft,
  Copy,
  BarChart3,
} from "lucide-react";
import { EventData, Team, Judge, Criterion } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [teamTable, setTeamTable] = useState("");
  const [teamProject, setTeamProject] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [critName, setCritName] = useState("");
  const [critDesc, setCritDesc] = useState("");
  const [critMax, setCritMax] = useState("10");
  const [critWeight, setCritWeight] = useState("1");
  const [judgesPerTeam, setJudgesPerTeam] = useState("3");

  const fetchEvent = useCallback(async () => {
    try {
      const res = await safeFetch("/api/event");
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
  }, [router]);

  useEffect(() => {
    const pin = sessionStorage.getItem("adminPin");
    if (!pin) {
      router.push("/");
      return;
    }
    fetchEvent();
  }, [router, fetchEvent]);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName || !teamTable) {
      toast.error("Team name and table number required");
      return;
    }
    try {
      const res = await safeFetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          tableNumber: teamTable,
          projectName: teamProject,
          description: teamDesc,
        }),
      });
      if (res.ok) {
        toast.success("Team added");
        setTeamName("");
        setTeamTable("");
        setTeamProject("");
        setTeamDesc("");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to add team");
    }
  }

  async function deleteTeam(id: string) {
    try {
      await safeFetch(`/api/teams?id=${id}`, { method: "DELETE" });
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
      const res = await safeFetch("/api/judges", {
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

  async function deleteJudge(id: string) {
    try {
      await safeFetch(`/api/judges?id=${id}`, { method: "DELETE" });
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
      const res = await safeFetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: critName,
          description: critDesc,
          maxScore: Number(critMax),
          weight: Number(critWeight),
        }),
      });
      if (res.ok) {
        toast.success("Criterion added");
        setCritName("");
        setCritDesc("");
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
      await safeFetch(`/api/criteria?id=${id}`, { method: "DELETE" });
      toast.success("Criterion removed");
      fetchEvent();
    } catch {
      toast.error("Failed to delete criterion");
    }
  }

  async function autoAssign() {
    try {
      const res = await safeFetch("/api/assignments", {
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
        await safeFetch(`/api/assignments?id=${a.id}`, { method: "DELETE" });
      }
      toast.success("All assignments cleared");
      fetchEvent();
    } catch {
      toast.error("Failed to clear assignments");
    }
  }

  async function addSingleAssignment(judgeId: string, teamId: string) {
    try {
      const res = await safeFetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId, teamId }),
      });
      if (res.ok) {
        toast.success("Assignment added");
        fetchEvent();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to add assignment");
    }
  }

  async function removeAssignment(id: string) {
    try {
      await safeFetch(`/api/assignments?id=${id}`, { method: "DELETE" });
      toast.success("Assignment removed");
      fetchEvent();
    } catch {
      toast.error("Failed to remove assignment");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) return null;

  const completedAssignments = event.assignments.filter(
    (a) => a.status === "completed"
  ).length;
  const totalAssignments = event.assignments.length;
  const progressPercent =
    totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {event.teams.length} Teams
            </Badge>
            <Badge variant="secondary">
              {event.judges.length} Judges
            </Badge>
            <Badge variant={progressPercent === 100 ? "default" : "outline"}>
              {progressPercent}% Complete
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-medium">Judging Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completedAssignments} / {totalAssignments} evaluations complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        <Tabs defaultValue="teams" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="teams" className="gap-1">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="judges" className="gap-1">
              <Award className="h-4 w-4" />
              Judges
            </TabsTrigger>
            <TabsTrigger value="criteria" className="gap-1">
              <Target className="h-4 w-4" />
              Criteria
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1">
              <Shuffle className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1">
              <Download className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Add Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addTeam} className="space-y-3">
                    <div>
                      <Label>Team Name</Label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Team Alpha"
                      />
                    </div>
                    <div>
                      <Label>Table Number</Label>
                      <Input
                        value={teamTable}
                        onChange={(e) => setTeamTable(e.target.value)}
                        placeholder="e.g. 12"
                      />
                    </div>
                    <div>
                      <Label>Project Name</Label>
                      <Input
                        value={teamProject}
                        onChange={(e) => setTeamProject(e.target.value)}
                        placeholder="optional"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={teamDesc}
                        onChange={(e) => setTeamDesc(e.target.value)}
                        placeholder="optional"
                        rows={2}
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2">
                      <Plus className="h-4 w-4" /> Add Team
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Teams ({event.teams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {event.teams.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No teams yet. Add your first team.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.teams.map((team: Team) => (
                          <TableRow key={team.id}>
                            <TableCell>
                              <Badge variant="outline">{team.tableNumber}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {team.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {team.projectName || "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTeam(team.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="judges">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Add Judge</CardTitle>
                  <CardDescription>
                    A unique 6-character access code is generated automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addJudge} className="space-y-3">
                    <div>
                      <Label>Judge Name</Label>
                      <Input
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="e.g. Dr. Smith"
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2">
                      <Plus className="h-4 w-4" /> Add Judge
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Judges ({event.judges.length})
                  </CardTitle>
                  <CardDescription>
                    Share access codes with judges so they can log in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {event.judges.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No judges yet. Add your first judge.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Access Code</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.judges.map((judge: Judge) => {
                          const judgeAssignments = event.assignments.filter(
                            (a) => a.judgeId === judge.id
                          );
                          const completed = judgeAssignments.filter(
                            (a) => a.status === "completed"
                          ).length;
                          return (
                            <TableRow key={judge.id}>
                              <TableCell className="font-medium">
                                {judge.name}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono tracking-widest">
                                    {judge.accessCode}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => copyCode(judge.accessCode)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>{judgeAssignments.length}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    completed === judgeAssignments.length &&
                                    judgeAssignments.length > 0
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {completed}/{judgeAssignments.length}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteJudge(judge.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="criteria">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Add Criterion</CardTitle>
                  <CardDescription>
                    Define what judges will score teams on. Weights affect the
                    final weighted average.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addCriterion} className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={critName}
                        onChange={(e) => setCritName(e.target.value)}
                        placeholder="e.g. Innovation"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={critDesc}
                        onChange={(e) => setCritDesc(e.target.value)}
                        placeholder="optional"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Max Score</Label>
                        <Input
                          type="number"
                          value={critMax}
                          onChange={(e) => setCritMax(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Weight</Label>
                        <Input
                          type="number"
                          value={critWeight}
                          onChange={(e) => setCritWeight(e.target.value)}
                          min="0.1"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2">
                      <Plus className="h-4 w-4" /> Add Criterion
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Scoring Criteria ({event.criteria.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {event.criteria.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No criteria yet. Add scoring criteria before judging
                      begins.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Max Score</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.criteria.map((criterion: Criterion) => (
                          <TableRow key={criterion.id}>
                            <TableCell className="font-medium">
                              {criterion.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {criterion.description || "—"}
                            </TableCell>
                            <TableCell>{criterion.maxScore}</TableCell>
                            <TableCell>{criterion.weight}x</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCriterion(criterion.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Auto-Assign Judges</CardTitle>
                  <CardDescription>
                    Automatically distribute judges evenly across teams. Existing
                    assignments are preserved.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4">
                    <div className="w-48">
                      <Label>Judges per Team</Label>
                      <Input
                        type="number"
                        value={judgesPerTeam}
                        onChange={(e) => setJudgesPerTeam(e.target.value)}
                        min="1"
                        max={String(event.judges.length)}
                      />
                    </div>
                    <Button onClick={autoAssign} className="gap-2">
                      <Shuffle className="h-4 w-4" /> Auto-Assign
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={clearAssignments}
                      disabled={event.assignments.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assignment Matrix</CardTitle>
                  <CardDescription>
                    Click cells to toggle judge-team assignments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {event.teams.length === 0 || event.judges.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Add teams and judges first to create assignments.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-white z-10">
                            Judge / Team
                          </TableHead>
                          {event.teams.map((team: Team) => (
                            <TableHead
                              key={team.id}
                              className="text-center whitespace-nowrap"
                            >
                              <div className="flex flex-col items-center">
                                <Badge variant="outline" className="mb-1">
                                  #{team.tableNumber}
                                </Badge>
                                <span className="text-xs">{team.name}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.judges.map((judge: Judge) => (
                          <TableRow key={judge.id}>
                            <TableCell className="font-medium sticky left-0 bg-white z-10">
                              {judge.name}
                            </TableCell>
                            {event.teams.map((team: Team) => {
                              const assignment = event.assignments.find(
                                (a) =>
                                  a.judgeId === judge.id &&
                                  a.teamId === team.id
                              );
                              return (
                                <TableCell
                                  key={team.id}
                                  className="text-center"
                                >
                                  {assignment ? (
                                    <Button
                                      size="sm"
                                      variant={
                                        assignment.status === "completed"
                                          ? "default"
                                          : assignment.status === "in_progress"
                                          ? "secondary"
                                          : "outline"
                                      }
                                      className={
                                        assignment.status === "completed"
                                          ? "bg-green-600 hover:bg-green-700"
                                          : assignment.status === "in_progress"
                                          ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                                          : "bg-blue-50 border-blue-200 text-blue-700"
                                      }
                                      onClick={() =>
                                        removeAssignment(assignment.id)
                                      }
                                    >
                                      {assignment.status === "completed"
                                        ? "Done"
                                        : assignment.status === "in_progress"
                                        ? "Active"
                                        : "Pending"}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-muted-foreground"
                                      onClick={() =>
                                        addSingleAssignment(
                                          judge.id,
                                          team.id
                                        )
                                      }
                                    >
                                      +
                                    </Button>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Results</CardTitle>
                <CardDescription>
                  Download all scores and data. CSV works in Excel/Sheets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      window.open("/api/export?format=csv", "_blank");
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open("/api/export?format=json", "_blank");
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" /> Download JSON
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Team Rankings</h3>
                  {event.teams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No teams to rank yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Avg Score</TableHead>
                          <TableHead>Evaluations</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {event.teams
                          .map((team: Team) => {
                            const teamAssignments = event.assignments.filter(
                              (a) =>
                                a.teamId === team.id &&
                                a.status === "completed"
                            );
                            let avgScore = 0;
                            if (teamAssignments.length > 0) {
                              const totals = teamAssignments.map((a) => {
                                let weightedSum = 0;
                                let totalWeight = 0;
                                for (const c of event.criteria) {
                                  const s = a.scores.find(
                                    (sc) => sc.criterionId === c.id
                                  );
                                  if (s) {
                                    weightedSum +=
                                      (s.value / c.maxScore) * c.weight;
                                    totalWeight += c.weight;
                                  }
                                }
                                return totalWeight > 0
                                  ? (weightedSum / totalWeight) * 100
                                  : 0;
                              });
                              avgScore =
                                totals.reduce((a, b) => a + b, 0) /
                                totals.length;
                            }
                            return { team, avgScore, count: teamAssignments.length };
                          })
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .map((item, index) => (
                            <TableRow key={item.team.id}>
                              <TableCell>
                                <Badge
                                  variant={
                                    index < 3 ? "default" : "secondary"
                                  }
                                >
                                  #{index + 1}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.team.name}
                              </TableCell>
                              <TableCell>{item.team.tableNumber}</TableCell>
                              <TableCell>
                                {item.avgScore > 0
                                  ? `${item.avgScore.toFixed(1)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell>{item.count}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
