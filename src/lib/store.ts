import fs from "fs";
import path from "path";
import { EventData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "event.json");

let cachedEvent: EventData | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromDisk(): EventData | null {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as EventData;
    } catch {
      return null;
    }
  }
  return null;
}

function saveToDisk(event: EventData) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(event, null, 2), "utf-8");
}

export function getEvent(): EventData | null {
  if (!cachedEvent) {
    cachedEvent = loadFromDisk();
  }
  return cachedEvent;
}

export function setEvent(event: EventData): EventData {
  cachedEvent = event;
  saveToDisk(event);
  return event;
}

export function updateEvent(
  updater: (event: EventData) => EventData
): EventData | null {
  const current = getEvent();
  if (!current) return null;
  const updated = updater(current);
  return setEvent(updated);
}

export function deleteEvent(): void {
  cachedEvent = null;
  if (fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
  }
}

export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
