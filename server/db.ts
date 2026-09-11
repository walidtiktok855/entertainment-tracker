import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertMediaItem, InsertUser, MediaItem, episodeProgress, mediaItems, playSessions, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getMediaForUser(userId: number) {
  const db = await getDb();
  if (!db) return [] as MediaItem[];
  return db.select().from(mediaItems).where(eq(mediaItems.userId, userId)).orderBy(desc(mediaItems.updatedAt));
}

export async function upsertMediaForUser(userId: number, item: Omit<InsertMediaItem, "userId" | "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = item.externalId
    ? await db.select().from(mediaItems).where(and(eq(mediaItems.userId, userId), eq(mediaItems.externalId, item.externalId))).limit(1)
    : await db.select().from(mediaItems).where(and(eq(mediaItems.userId, userId), eq(mediaItems.title, item.title))).limit(1);
  if (existing[0]) {
    await db.update(mediaItems).set({ ...item, updatedAt: new Date() }).where(and(eq(mediaItems.id, existing[0].id), eq(mediaItems.userId, userId)));
    return { ...existing[0], ...item };
  }
  const inserted = await db.insert(mediaItems).values({ ...item, userId }).$returningId();
  return { ...item, userId, id: inserted[0]?.id };
}

export async function updateMediaForUser(userId: number, id: number, patch: Partial<MediaItem>) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(mediaItems).set({ ...patch, updatedAt: new Date() }).where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId)));
  const rows = await db.select().from(mediaItems).where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId))).limit(1);
  return rows[0];
}

export async function getEpisodesForUser(userId: number, mediaItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(episodeProgress).where(and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaItemId, mediaItemId))).orderBy(episodeProgress.seasonNumber, episodeProgress.episodeNumber);
}

export async function toggleEpisodeForUser(userId: number, input: { mediaItemId: number; seasonNumber: number; episodeNumber: number; title?: string; watched: boolean }) {
  const db = await getDb();
  if (!db) return undefined;
  const where = and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaItemId, input.mediaItemId), eq(episodeProgress.seasonNumber, input.seasonNumber), eq(episodeProgress.episodeNumber, input.episodeNumber));
  const current = await db.select().from(episodeProgress).where(where).limit(1);
  const patch = { watched: input.watched ? 1 : 0, title: input.title ?? null, watchedAt: input.watched ? new Date() : null };
  if (current[0]) { await db.update(episodeProgress).set(patch).where(eq(episodeProgress.id, current[0].id)); return { ...current[0], ...patch }; }
  const inserted = await db.insert(episodeProgress).values({ userId, ...input, watched: input.watched ? 1 : 0, watchedAt: input.watched ? new Date() : null }).$returningId();
  return { id: inserted[0]?.id, userId, ...input, watched: input.watched ? 1 : 0, watchedAt: input.watched ? new Date() : null };
}

export async function addPlaySession(userId: number, input: { mediaItemId: number; startedAt: Date; endedAt?: Date; minutes: number; note?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const inserted = await db.insert(playSessions).values({ userId, ...input }).$returningId();
  const current = await db.select().from(mediaItems).where(and(eq(mediaItems.id, input.mediaItemId), eq(mediaItems.userId, userId))).limit(1);
  if (current[0]) await db.update(mediaItems).set({ hours: current[0].hours + Math.round(input.minutes / 60), updatedAt: new Date() }).where(eq(mediaItems.id, input.mediaItemId));
  return { id: inserted[0]?.id, ...input };
}
