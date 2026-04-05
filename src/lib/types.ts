export interface Criterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
}

export interface OrganizerNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  tableNumber: string;
  projectName: string;
  description: string;
}

export interface Judge {
  id: string;
  name: string;
  accessCode: string;
}

export interface Score {
  criterionId: string;
  value: number;
}

export interface Assignment {
  id: string;
  judgeId: string;
  teamId: string;
  scores: Score[];
  notes: string;
  status: "pending" | "in_progress" | "completed";
}

export interface EventData {
  id: string;
  name: string;
  description: string;
  adminPin: string;
  criteria: Criterion[];
  teams: Team[];
  judges: Judge[];
  assignments: Assignment[];
  createdAt: string;
  judgingStatus: "idle" | "active" | "stopped";
  judgingStartedAt: string | null;
  judgingStoppedAt: string | null;
  judgingDuration: number; // minutes, 0 = unlimited
  organizerNotes: string; // markdown/plain text notes shown to judges
  useWeightedScoring: boolean; // true = weighted, false = raw average
}
