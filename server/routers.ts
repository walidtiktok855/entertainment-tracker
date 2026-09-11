import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { callDataApi } from "./_core/dataApi";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addPlaySession, getEpisodesForUser, getMediaForUser, toggleEpisodeForUser, updateMediaForUser, upsertMediaForUser } from "./db";

const mediaInput = z.object({
  externalId: z.string().optional(), title: z.string().min(1), type: z.enum(["Game", "Series", "Movie"]), status: z.string(), genre: z.string().optional(), platform: z.string().optional(), progress: z.number().int().min(0).max(100).default(0), rating: z.number().int().min(0).max(5).default(0), favorite: z.boolean().default(false), hours: z.number().int().min(0).default(0), detail: z.string().optional(), image: z.string().optional(), metadataJson: z.string().optional(),
});

function normalizeSearchItems(payload: any, type: "Game" | "Series" | "Movie") {
  if (type === "Series" && Array.isArray(payload)) return payload.slice(0, 8).map((entry: any) => ({ externalId: `tvmaze:${entry.show?.id}`, title: entry.show?.name ?? "Untitled", type, genre: entry.show?.genres?.[0] ?? "Series", platform: entry.show?.network?.name ?? entry.show?.webChannel?.name ?? "TV", image: entry.show?.image?.medium ?? entry.show?.image?.original ?? "", detail: entry.show?.premiered ? `Premiered ${entry.show.premiered.slice(0, 4)}` : "Series", status: "Want to watch" }));
  if (type === "Movie" && Array.isArray(payload?.results)) return payload.results.slice(0, 8).map((entry: any) => ({ externalId: `itunes:${entry.trackId}`, title: entry.trackName ?? "Untitled", type, genre: entry.primaryGenreName ?? "Movie", platform: "Apple TV", image: entry.artworkUrl100?.replace("100x100", "600x900") ?? "", detail: entry.releaseDate ? `Released ${entry.releaseDate.slice(0, 4)}` : "Movie", status: "Want to watch" }));
  if (type === "Game" && Array.isArray(payload?.query?.search)) return payload.query.search.slice(0, 8).map((entry: any) => ({ externalId: `wiki:${entry.pageid}`, title: entry.title, type, genre: "Game", platform: "Game library", image: "", detail: "Metadata result", status: "Want to play" }));
  return [];
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  tracker: router({
    list: protectedProcedure.query(({ ctx }) => getMediaForUser(ctx.user.id)),
    sync: protectedProcedure.input(z.object({ items: z.array(mediaInput) })).mutation(async ({ ctx, input }) => { for (const item of input.items) await upsertMediaForUser(ctx.user.id, { ...item, favorite: item.favorite ? 1 : 0 }); return getMediaForUser(ctx.user.id); }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), patch: mediaInput.partial() })).mutation(({ ctx, input }) => updateMediaForUser(ctx.user.id, input.id, { ...input.patch, favorite: input.patch.favorite === undefined ? undefined : input.patch.favorite ? 1 : 0 })),
    search: publicProcedure.input(z.object({ query: z.string().min(2), type: z.enum(["Game", "Series", "Movie"]) })).query(async ({ input }) => {
      try {
        if (input.type === "Series") return normalizeSearchItems(await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(input.query)}`).then((response) => response.json()), input.type);
        if (input.type === "Movie") return normalizeSearchItems(await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(input.query)}&media=movie&entity=movie&limit=8`).then((response) => response.json()), input.type);
        return normalizeSearchItems(await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${input.query} video game`)}&format=json&origin=*`).then((response) => response.json()), input.type);
      } catch (error) {
        console.warn("[Metadata] Search failed", error);
        try { return normalizeSearchItems(await callDataApi("Wikipedia/search", { query: { q: input.query } }), input.type); } catch { return []; }
      }
    }),
    episodes: protectedProcedure.input(z.object({ mediaItemId: z.number().int() })).query(({ ctx, input }) => getEpisodesForUser(ctx.user.id, input.mediaItemId)),
    toggleEpisode: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), seasonNumber: z.number().int().min(1), episodeNumber: z.number().int().min(1), title: z.string().optional(), watched: z.boolean() })).mutation(({ ctx, input }) => toggleEpisodeForUser(ctx.user.id, input)),
    logPlaytime: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), startedAt: z.number().int(), endedAt: z.number().int().optional(), minutes: z.number().int().min(1).max(1440), note: z.string().max(500).optional() })).mutation(({ ctx, input }) => addPlaySession(ctx.user.id, { mediaItemId: input.mediaItemId, startedAt: new Date(input.startedAt), endedAt: input.endedAt ? new Date(input.endedAt) : undefined, minutes: input.minutes, note: input.note })),
  }),
});

export type AppRouter = typeof appRouter;
