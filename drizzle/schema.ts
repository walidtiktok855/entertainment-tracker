import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  cemeteryDefaultCategory: varchar("cemeteryDefaultCategory", { length: 32 }),
  monthlyGoal: int("monthlyGoal").default(10).notNull(),
});

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  externalId: varchar("externalId", { length: 128 }),
  title: varchar("title", { length: 255 }),
  type: mysqlEnum("type", ["Game", "Series", "Movie"]),
  category: mysqlEnum("category", ["Movie", "Game", "Software", "Study", "Other"]),
  note: text("note"),
  sourceLink: text("sourceLink"),
  stage: mysqlEnum("stage", ["inbox", "library"]).default("library").notNull(),
  scheduledDate: timestamp("scheduledDate"),
  completedAt: timestamp("completedAt"),
  status: varchar("status", { length: 40 }),
  genre: varchar("genre", { length: 120 }),
  platform: varchar("platform", { length: 120 }),
  progress: int("progress").default(0).notNull(),
  rating: int("rating").default(0).notNull(),
  favorite: int("favorite").default(0).notNull(),
  hours: int("hours").default(0).notNull(),
  detail: varchar("detail", { length: 255 }),
  image: text("image"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userExternalIdx: uniqueIndex("media_user_external_idx").on(table.userId, table.externalId) }));

export const episodeProgress = mysqlTable("episodeProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mediaItemId: int("mediaItemId").notNull(),
  seasonNumber: int("seasonNumber").notNull(),
  episodeNumber: int("episodeNumber").notNull(),
  title: varchar("title", { length: 255 }),
  watched: int("watched").default(0).notNull(),
  watchedAt: timestamp("watchedAt"),
}, (table) => ({ episodeKey: uniqueIndex("episode_progress_key").on(table.userId, table.mediaItemId, table.seasonNumber, table.episodeNumber) }));

export const playSessions = mysqlTable("playSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mediaItemId: int("mediaItemId").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  minutes: int("minutes").default(0).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MediaItem = typeof items.$inferSelect;
export type InsertMediaItem = typeof items.$inferInsert;
export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;
export type EpisodeProgress = typeof episodeProgress.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;
