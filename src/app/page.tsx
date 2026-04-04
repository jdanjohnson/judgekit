"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { safeFetch } from "@/lib/fetch";
import {
  ClipboardList,
  Shield,
  Users,
  Hash,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [adminPin, setAdminPin] = useState("");
  const [judgeCode, setJudgeCode] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await safeFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin }),
      });
      if (res.ok) {
        sessionStorage.setItem("adminPin", adminPin);
        router.push("/admin");
      } else {
        const data = await res.json();
        if (res.status === 404) {
          toast.error("No event exists yet. Create one first.");
        } else {
          toast.error(data.error || "Invalid PIN");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection error");
    }
    setLoading(false);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventName || !newPin) {
      toast.error("Event name and admin PIN are required");
      return;
    }
    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await safeFetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventName,
          description: eventDesc,
          adminPin: newPin,
        }),
      });
      if (res.ok) {
        sessionStorage.setItem("adminPin", newPin);
        toast.success("Event created!");
        router.push("/admin");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create event");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection error");
    }
    setLoading(false);
  }

  function handleJudgeLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!judgeCode.trim()) {
      toast.error("Enter your judge access code");
      return;
    }
    router.push(`/judge/${judgeCode.trim().toUpperCase()}`);
  }

  function handleTeamLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!tableNumber.trim()) {
      toast.error("Enter your table number");
      return;
    }
    router.push(`/team/${encodeURIComponent(tableNumber.trim())}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">JudgeKit</h1>
            <p className="text-sm text-muted-foreground">
              Hackathon & Science Fair Judging
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome to JudgeKit</h2>
            <p className="text-muted-foreground">
              Lightweight judging assignment and scoring for your event. No
              accounts, no database — just fast, simple judging.
            </p>
          </div>

          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="join" className="gap-2">
                <Users className="h-4 w-4" />
                Join
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                New Event
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Judge Portal
                    </CardTitle>
                    <CardDescription>
                      Enter your 6-character access code to view assignments and
                      score teams.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleJudgeLogin} className="space-y-3">
                      <div>
                        <Label htmlFor="judgeCode">Access Code</Label>
                        <Input
                          id="judgeCode"
                          placeholder="e.g. ABC123"
                          value={judgeCode}
                          onChange={(e) =>
                            setJudgeCode(e.target.value.toUpperCase())
                          }
                          maxLength={6}
                          className="font-mono text-lg tracking-widest"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Enter as Judge
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      Team View
                    </CardTitle>
                    <CardDescription>
                      Enter your table number to see which judges are assigned to
                      your team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTeamLookup} className="space-y-3">
                      <div>
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input
                          id="tableNumber"
                          placeholder="e.g. 12"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                      <Button type="submit" variant="outline" className="w-full">
                        View Team Status
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Login</CardTitle>
                  <CardDescription>
                    Enter your admin PIN to manage the event, assign judges, and
                    track progress.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <div>
                      <Label htmlFor="adminPin">Admin PIN</Label>
                      <Input
                        id="adminPin"
                        type="password"
                        placeholder="Enter admin PIN"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Logging in..." : "Enter Admin Dashboard"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Event</CardTitle>
                  <CardDescription>
                    Set up a new hackathon or science fair judging event. You can
                    add teams, judges, and scoring criteria after creation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div>
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input
                        id="eventName"
                        placeholder="e.g. Spring 2026 Hackathon"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventDesc">Description (optional)</Label>
                      <Textarea
                        id="eventDesc"
                        placeholder="Brief description of the event..."
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPin">Admin PIN</Label>
                      <Input
                        id="newPin"
                        type="password"
                        placeholder="At least 4 characters"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        You&apos;ll use this PIN to access the admin dashboard.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating..." : "Create Event"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        JudgeKit — No database, no accounts. Just judging.
      </footer>
    </div>
  );
}
