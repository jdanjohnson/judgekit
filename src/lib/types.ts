export interface Criterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
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

export interface Prize {
  id: string;
  name: string; // e.g., "Best use of Mux + AI"
  sponsor: string; // e.g., "Mux"
  description: string;
  teamIds: string[]; // teams that opted into this prize
  judgeIds: string[]; // judges responsible for scoring this prize's teams
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
  prizes: Prize[]; // sponsor / opt-in challenge prizes
  eventDate: string; // ISO date string for the event date (editable by master admin)
  createdAt: string;
  judgingStatus: "idle" | "active" | "stopped";
  judgingStartedAt: string | null;
  judgingStoppedAt: string | null;
  judgingDuration: number; // minutes, 0 = unlimited
  organizerNotes: string; // markdown/plain text notes shown to judges
  useWeightedScoring: boolean; // true = weighted, false = raw average
}
