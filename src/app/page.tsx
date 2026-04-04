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
import {
  ClipboardList,
  Shield,
  Users,
  Hash,
  Link,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [judgeCode, setJudgeCode] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId.trim()) {
      toast.error("Enter the event ID");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin?eventId=${encodeURIComponent(eventId.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: adminPin }),
        }
      );
      if (res.ok) {
        sessionStorage.setItem("adminPin", adminPin);
        router.push(`/event/${encodeURIComponent(eventId.trim())}/admin`);
      } else {
        const data = await res.json();
        if (res.status === 404) {
          toast.error("No event found with that ID.");
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
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventName,
          description: eventDesc,
          adminPin: newPin,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("adminPin", newPin);
        toast.success("Event created!");
        router.push(`/event/${data.id}/admin`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create event");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection error");
    }
    setLoading(false);
  }

  function handleJoinEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId.trim()) {
      toast.error("Enter an event ID first");
      return;
    }
    const eid = encodeURIComponent(eventId.trim());
    if (judgeCode.trim()) {
      router.push(
        `/event/${eid}/judge/${encodeURIComponent(judgeCode.trim().toUpperCase())}`
      );
    } else if (tableNumber.trim()) {
      router.push(
        `/event/${eid}/team/${encodeURIComponent(tableNumber.trim())}`
      );
    } else {
      toast.error("Enter a judge access code or table number");
    }
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
              accounts needed — just fast, simple judging with shareable links.
            </p>
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                New Event
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-2">
                <Users className="h-4 w-4" />
                Join
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Event</CardTitle>
                  <CardDescription>
                    Set up a new hackathon or science fair judging event.
                    You&apos;ll get a shareable event link for judges and teams.
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

            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Login</CardTitle>
                  <CardDescription>
                    Enter your event ID and admin PIN to manage an existing
                    event.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <div>
                      <Label htmlFor="adminEventId">Event ID</Label>
                      <Input
                        id="adminEventId"
                        placeholder="e.g. abc12345"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                        className="font-mono"
                      />
                    </div>
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

            <TabsContent value="join">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Join an Event
                  </CardTitle>
                  <CardDescription>
                    Enter the event ID you received, then your judge code or
                    table number. Or use the direct link shared with you.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleJoinEvent} className="space-y-4">
                    <div>
                      <Label htmlFor="joinEventId">Event ID</Label>
                      <Input
                        id="joinEventId"
                        placeholder="e.g. abc12345"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="judgeCode" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Judge Code
                        </Label>
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
                      <div>
                        <Label htmlFor="tableNumber" className="flex items-center gap-1">
                          <Hash className="h-3 w-3" /> Table Number
                        </Label>
                        <Input
                          id="tableNumber"
                          placeholder="e.g. 12"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Join Event
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        JudgeKit — Shareable judging for hackathons and science fairs.
      </footer>
    </div>
  );
}
