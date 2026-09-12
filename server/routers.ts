import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { callDataApi } from "./_core/dataApi";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addPlaySession, getEpisodesForUser, getMediaForUser, toggleEpisodeForUser, updateMediaForUser, upsertMediaForUser } from "./db";

const mediaInput = z.object({
  externalId: z.string().optional(), title: z.string().min(1), type: z.enum(["Game", "Series", "Movie"]), status: z.string(), genre: z.string().optional(), platform: z.string().optional(), progress: z.number().int().min(0).max(100).default(0), rating: z.number().int().min(0).max(50).default(0), favorite: z.boolean().default(false), hours: z.number().int().min(0).default(0), detail: z.string().optional(), image: z.string().optional(), metadataJson: z.string().optional(),
});

const tmdbGenres: Record<number, string> = { 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-fi", 10770: "TV movie", 53: "Thriller", 10752: "War", 37: "Western" };

async function tmdbRequest(path: string, query: Record<string, string> = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { accept: "application/json" };
  if (ENV.tmdbReadAccessToken) headers.Authorization = `Bearer ${ENV.tmdbReadAccessToken}`;
  else if (ENV.tmdbApiKey) url.searchParams.set("api_key", ENV.tmdbApiKey);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`TMDB returned ${response.status}`);
  return response.json();
}

function normalizeSearchItems(payload: any, type: "Game" | "Series" | "Movie") {
  if (type === "Series" && Array.isArray(payload?.results)) return payload.results.slice(0, 8).map((entry: any) => {
    const genres = (entry.genre_ids ?? []).map((id: number) => tmdbGenres[id]).filter(Boolean).slice(0, 3);
    const metadata = { source: "TMDB", mediaType: "tv", id: entry.id, firstAirDate: entry.first_air_date, voteAverage: entry.vote_average, voteCount: entry.vote_count, overview: entry.overview, originalLanguage: entry.original_language };
    return { externalId: `tmdb:tv:${entry.id}`, title: entry.name ?? "Untitled", type, genre: genres.join(", ") || "Series", platform: "TMDB", image: entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : "", detail: [entry.first_air_date ? `First aired ${entry.first_air_date.slice(0, 4)}` : "", entry.vote_average ? `${entry.vote_average.toFixed(1)}/10 TMDB` : ""].filter(Boolean).join(" · ") || "Series", status: "Want to watch", metadataJson: JSON.stringify(metadata) };
  });
  if (type === "Movie" && Array.isArray(payload?.results)) return payload.results.slice(0, 8).map((entry: any) => {
    const genres = (entry.genre_ids ?? []).map((id: number) => tmdbGenres[id]).filter(Boolean).slice(0, 3);
    const metadata = { source: "TMDB", mediaType: "movie", id: entry.id, releaseDate: entry.release_date, voteAverage: entry.vote_average, voteCount: entry.vote_count, overview: entry.overview, originalLanguage: entry.original_language };
    return { externalId: `tmdb:movie:${entry.id}`, title: entry.title ?? "Untitled", type, genre: genres.join(", ") || "Movie", platform: "TMDB", image: entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : "", detail: [entry.release_date ? `Released ${entry.release_date.slice(0, 4)}` : "", entry.vote_average ? `${entry.vote_average.toFixed(1)}/10 TMDB` : ""].filter(Boolean).join(" · ") || "Movie", status: "Want to watch", metadataJson: JSON.stringify(metadata) };
  });
  if (type === "Series" && Array.isArray(payload)) return payload.slice(0, 8).map((entry: any) => ({ externalId: `tvmaze:${entry.show?.id}`, title: entry.show?.name ?? "Untitled", type, genre: entry.show?.genres?.[0] ?? "Series", platform: entry.show?.network?.name ?? entry.show?.webChannel?.name ?? "TV", image: entry.show?.image?.medium ?? entry.show?.image?.original ?? "", detail: entry.show?.premiered ? `Premiered ${entry.show.premiered.slice(0, 4)}` : "Series", status: "Want to watch" }));
  if (type === "Movie" && Array.isArray(payload?.results)) return payload.results.slice(0, 8).map((entry: any) => ({ externalId: `itunes:${entry.trackId}`, title: entry.trackName ?? "Untitled", type, genre: entry.primaryGenreName ?? "Movie", platform: "Apple TV", image: entry.artworkUrl100?.replace("100x100", "600x900") ?? "", detail: entry.releaseDate ? `Released ${entry.releaseDate.slice(0, 4)}` : "Movie", status: "Want to watch" }));
  if (type === "Game" && Array.isArray(payload?.results)) return payload.results.slice(0, 8).map((entry: any) => {
    const platforms = (entry.platforms ?? []).map((platform: any) => platform.platform?.name).filter(Boolean).slice(0, 4);
    const genres = (entry.genres ?? []).map((genre: any) => genre.name).filter(Boolean).slice(0, 2);
    const metadata = { source: "RAWG", id: entry.id, slug: entry.slug, released: entry.released, rating: entry.rating, ratingsCount: entry.ratings_count, metacritic: entry.metacritic, platforms, genres, tags: (entry.tags ?? []).slice(0, 8).map((tag: any) => tag.name), stores: (entry.stores ?? []).slice(0, 6).map((store: any) => store.store?.name), screenshots: (entry.short_screenshots ?? []).slice(0, 6).map((shot: any) => shot.image) };
    return { externalId: `rawg:${entry.id}`, title: entry.name ?? "Untitled", type, genre: genres.join(", ") || "Game", platform: platforms.join(", ") || "Game library", image: entry.background_image ?? "", detail: [entry.released ? `Released ${entry.released.slice(0, 4)}` : "Release date unknown", entry.rating ? `${entry.rating.toFixed(1)}/5 RAWG` : ""].filter(Boolean).join(" · "), status: "Want to play", metadataJson: JSON.stringify(metadata) };
  });
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
        if (input.type === "Series" && (ENV.tmdbReadAccessToken || ENV.tmdbApiKey)) return normalizeSearchItems(await tmdbRequest("/search/tv", { query: input.query, include_adult: "false", language: "en-US" }), input.type);
        if (input.type === "Movie" && (ENV.tmdbReadAccessToken || ENV.tmdbApiKey)) return normalizeSearchItems(await tmdbRequest("/search/movie", { query: input.query, include_adult: "false", language: "en-US" }), input.type);
        if (input.type === "Series") return normalizeSearchItems(await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(input.query)}`).then((response) => response.json()), input.type);
        if (input.type === "Movie") return normalizeSearchItems(await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(input.query)}&media=movie&entity=movie&limit=8`).then((response) => response.json()), input.type);
        if (input.type === "Game" && ENV.rawgApiKey) {
          const response = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(ENV.rawgApiKey)}&search=${encodeURIComponent(input.query)}&page_size=8&search_precise=true`);
          if (!response.ok) throw new Error(`RAWG returned ${response.status}`);
          return normalizeSearchItems(await response.json(), input.type);
        }
        return normalizeSearchItems(await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${input.query} video game`)}&format=json&origin=*`).then((response) => response.json()), input.type);
      } catch (error) {
        console.warn("[Metadata] Search failed", error);
        try { return normalizeSearchItems(await callDataApi("Wikipedia/search", { query: { q: input.query } }), input.type); } catch { return []; }
      }
    }),
    episodeCatalog: publicProcedure.input(z.object({ externalId: z.string().regex(/^tmdb:tv:\d+$/) })).query(async ({ input }) => {
      if (!ENV.tmdbReadAccessToken && !ENV.tmdbApiKey) return [];
      try {
        const showId = input.externalId.split(":").pop() ?? "";
        const show = await tmdbRequest(`/tv/${showId}`, { language: "en-US" });
        const seasons = (show.seasons ?? []).filter((season: any) => season.season_number > 0).slice(0, 12);
        const seasonDetails = await Promise.all(seasons.map((season: any) => tmdbRequest(`/tv/${showId}/season/${season.season_number}`, { language: "en-US" })));
        return seasonDetails.flatMap((season: any) => (season.episodes ?? []).map((episode: any) => ({ seasonNumber: episode.season_number, episodeNumber: episode.episode_number, title: episode.name ?? `Episode ${episode.episode_number}`, airDate: episode.air_date ?? null, runtime: episode.runtime ?? null, overview: episode.overview ?? "", image: episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : "" })));
      } catch (error) { console.warn("[Metadata] Episode catalog failed", error); return []; }
    }),
    episodes: protectedProcedure.input(z.object({ mediaItemId: z.number().int() })).query(({ ctx, input }) => getEpisodesForUser(ctx.user.id, input.mediaItemId)),
    toggleEpisode: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), seasonNumber: z.number().int().min(1), episodeNumber: z.number().int().min(1), title: z.string().optional(), watched: z.boolean() })).mutation(({ ctx, input }) => toggleEpisodeForUser(ctx.user.id, input)),
    logPlaytime: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), startedAt: z.number().int(), endedAt: z.number().int().optional(), minutes: z.number().int().min(1).max(1440), note: z.string().max(500).optional() })).mutation(({ ctx, input }) => addPlaySession(ctx.user.id, { mediaItemId: input.mediaItemId, startedAt: new Date(input.startedAt), endedAt: input.endedAt ? new Date(input.endedAt) : undefined, minutes: input.minutes, note: input.note })),
  }),
});

export type AppRouter = typeof appRouter;
