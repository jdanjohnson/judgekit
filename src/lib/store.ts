import { Redis } from "@upstash/redis";
import { EventData } from "./types";

function getRedis(): Redis {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
    );
  }

  return new Redis({ url, token });
}

export async function getEvent(eventId: string): Promise<EventData | null> {
  const redis = getRedis();
  const data = await redis.get<EventData>(`event:${eventId}`);
  if (!data) return null;
  // Backfill fields introduced after older events were written.
  return { ...data, prizes: data.prizes ?? [] };
}

export async function setEvent(event: EventData): Promise<EventData> {
  const redis = getRedis();
  await redis.set(`event:${event.id}`, JSON.stringify(event));
  return event;
}

export async function updateEvent(
  eventId: string,
  updater: (event: EventData) => EventData
): Promise<EventData | null> {
  const current = await getEvent(eventId);
  if (!current) return null;
  const updated = updater(current);
  return setEvent(updated);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`event:${eventId}`);
}

export async function getAllEventIds(): Promise<string[]> {
  const redis = getRedis();
  const keys = await redis.keys("event:*");
  return keys.map((k) => k.replace("event:", ""));
}

export function generateEventId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
