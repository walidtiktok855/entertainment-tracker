import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { callDataApi } from "./_core/dataApi";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addPlaySession, getEpisodesForUser, getInboxItemsForUser, getMediaForUser, getUserPreference, setUserPreference, toggleEpisodeForUser, updateMediaForUser, upsertMediaForUser } from "./db";

const mediaInput = z.object({
  externalId: z.string().optional(), title: z.string().min(1), type: z.enum(["Game", "Series", "Movie"]), status: z.string(), genre: z.string().optional(), platform: z.string().optional(), progress: z.number().int().min(0).max(100).default(0), rating: z.number().int().min(0).max(50).default(0), favorite: z.boolean().default(false), hours: z.number().int().min(0).default(0), detail: z.string().optional(), image: z.string().optional(), metadataJson: z.string().optional(),
});
const cemeteryCategory = z.enum(["Movie", "Game", "Software", "Study", "Other"]);
const cemeteryInput = z.object({ title: z.string().max(255).optional(), category: cemeteryCategory.nullable().optional(), note: z.string().max(2000).optional(), sourceLink: z.string().max(2000).optional() });

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

async function rawgRequest(path: string, query: Record<string, string> = {}) {
  if (!ENV.rawgApiKey) throw new Error("RAWG is not configured");
  const url = new URL(`https://api.rawg.io/api${path}`);
  url.searchParams.set("key", ENV.rawgApiKey);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`RAWG returned ${response.status}`);
  return response.json();
}

async function getMetadataDetail(externalId: string) {
  if (externalId.startsWith("rawg:")) {
    const id = externalId.split(":").pop() ?? "";
    const entry = await rawgRequest(`/games/${id}`);
    const platforms = (entry.platforms ?? []).map((value: any) => value.platform?.name).filter(Boolean).slice(0, 8);
    const genres = (entry.genres ?? []).map((value: any) => value.name).filter(Boolean).slice(0, 6);
    const metadata = { source: "RAWG", id: entry.id, slug: entry.slug, released: entry.released, rating: entry.rating, ratingsCount: entry.ratings_count, metacritic: entry.metacritic, description: entry.description_raw ?? entry.description ?? "", platforms, genres, tags: (entry.tags ?? []).slice(0, 12).map((value: any) => value.name), stores: (entry.stores ?? []).slice(0, 8).map((value: any) => value.store?.name), developers: (entry.developers ?? []).map((value: any) => value.name).filter(Boolean).slice(0, 6), publishers: (entry.publishers ?? []).map((value: any) => value.name).filter(Boolean).slice(0, 6), screenshots: (entry.short_screenshots ?? []).map((value: any) => value.image).filter(Boolean).slice(0, 10), trailer: entry.clip?.clip ?? "" };
    return { title: entry.name ?? "Untitled", type: "Game" as const, genre: genres.join(", ") || "Game", platform: platforms.join(", ") || "Game library", image: entry.background_image ?? "", detail: [entry.released ? `Released ${entry.released.slice(0, 4)}` : "Release date unknown", entry.rating ? `${entry.rating.toFixed(1)}/5 RAWG` : ""].filter(Boolean).join(" · "), metadataJson: JSON.stringify(metadata) };
  }
  if (externalId.startsWith("tmdb:movie:")) {
    const id = externalId.split(":").pop() ?? "";
    const entry = await tmdbRequest(`/movie/${id}`, { language: "en-US", append_to_response: "credits,videos" });
    const genres = (entry.genres ?? []).map((value: any) => value.name).filter(Boolean).slice(0, 6);
    const metadata = { source: "TMDB", mediaType: "movie", id: entry.id, releaseDate: entry.release_date, voteAverage: entry.vote_average, voteCount: entry.vote_count, overview: entry.overview, originalLanguage: entry.original_language, runtime: entry.runtime, genres, cast: (entry.credits?.cast ?? []).slice(0, 12).map((value: any) => ({ name: value.name, character: value.character, image: value.profile_path ? `https://image.tmdb.org/t/p/w185${value.profile_path}` : "" })), trailers: (entry.videos?.results ?? []).filter((value: any) => value.site === "YouTube").slice(0, 5).map((value: any) => ({ name: value.name, key: value.key, type: value.type })) };
    return { title: entry.title ?? "Untitled", type: "Movie" as const, genre: genres.join(", ") || "Movie", platform: "TMDB", image: entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : "", detail: [entry.release_date ? `Released ${entry.release_date.slice(0, 4)}` : "", entry.runtime ? `${entry.runtime} min` : "", entry.vote_average ? `${entry.vote_average.toFixed(1)}/10 TMDB` : ""].filter(Boolean).join(" · "), metadataJson: JSON.stringify(metadata) };
  }
  if (externalId.startsWith("tmdb:tv:")) {
    const id = externalId.split(":").pop() ?? "";
    const entry = await tmdbRequest(`/tv/${id}`, { language: "en-US", append_to_response: "credits,videos" });
    const genres = (entry.genres ?? []).map((value: any) => value.name).filter(Boolean).slice(0, 6);
    const metadata = { source: "TMDB", mediaType: "tv", id: entry.id, firstAirDate: entry.first_air_date, voteAverage: entry.vote_average, voteCount: entry.vote_count, overview: entry.overview, originalLanguage: entry.original_language, runtime: entry.episode_run_time?.[0] ?? null, numberOfSeasons: entry.number_of_seasons, numberOfEpisodes: entry.number_of_episodes, seasons: (entry.seasons ?? []).filter((value: any) => value.season_number > 0).map((value: any) => ({ seasonNumber: value.season_number, name: value.name, episodeCount: value.episode_count, airDate: value.air_date, image: value.poster_path ? `https://image.tmdb.org/t/p/w342${value.poster_path}` : "" })), cast: (entry.credits?.cast ?? []).slice(0, 12).map((value: any) => ({ name: value.name, character: value.character, image: value.profile_path ? `https://image.tmdb.org/t/p/w185${value.profile_path}` : "" })), trailers: (entry.videos?.results ?? []).filter((value: any) => value.site === "YouTube").slice(0, 5).map((value: any) => ({ name: value.name, key: value.key, type: value.type })) };
    return { title: entry.name ?? "Untitled", type: "Series" as const, genre: genres.join(", ") || "Series", platform: "TMDB", image: entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : "", detail: [entry.first_air_date ? `First aired ${entry.first_air_date.slice(0, 4)}` : "", entry.number_of_seasons ? `${entry.number_of_seasons} seasons` : "", entry.vote_average ? `${entry.vote_average.toFixed(1)}/10 TMDB` : ""].filter(Boolean).join(" · "), metadataJson: JSON.stringify(metadata) };
  }
  return null;
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
    cemetery: protectedProcedure.query(({ ctx }) => getInboxItemsForUser(ctx.user.id)),
    cemeteryDefault: protectedProcedure.query(({ ctx }) => getUserPreference(ctx.user.id)),
    setCemeteryDefault: protectedProcedure.input(z.object({ category: cemeteryCategory.nullable() })).mutation(({ ctx, input }) => setUserPreference(ctx.user.id, input.category)),
    quickAdd: protectedProcedure.input(cemeteryInput).mutation(({ ctx, input }) => upsertMediaForUser(ctx.user.id, { title: input.title?.trim() || null, type: null, category: input.category ?? null, note: input.note?.trim() || null, sourceLink: input.sourceLink?.trim() || null, stage: "inbox", status: null, genre: null, platform: null, progress: 0, rating: 0, favorite: 0, hours: 0, detail: null, image: null, metadataJson: null, externalId: null, scheduledDate: null })),
    promote: protectedProcedure.input(z.object({ id: z.number().int(), item: mediaInput.partial().extend({ type: z.enum(["Game", "Series", "Movie"]), status: z.string() }) })).mutation(async ({ ctx, input }) => {
      const current = await getInboxItemsForUser(ctx.user.id);
      if (!current.some((item) => item.id === input.id)) throw new Error("Cemetery item not found");
      return updateMediaForUser(ctx.user.id, input.id, { ...input.item, favorite: input.item.favorite === undefined ? undefined : input.item.favorite ? 1 : 0, stage: "library", category: input.item.type === "Game" ? "Game" : input.item.type === "Movie" ? "Movie" : null, title: input.item.title || "Untitled", status: input.item.status });
    }),
    sync: protectedProcedure.input(z.object({ items: z.array(mediaInput) })).mutation(async ({ ctx, input }) => { for (const item of input.items) await upsertMediaForUser(ctx.user.id, { ...item, favorite: item.favorite ? 1 : 0 }); return getMediaForUser(ctx.user.id); }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), patch: mediaInput.partial() })).mutation(({ ctx, input }) => updateMediaForUser(ctx.user.id, input.id, { ...input.patch, favorite: input.patch.favorite === undefined ? undefined : input.patch.favorite ? 1 : 0 })),
    detail: publicProcedure.input(z.object({ externalId: z.string().min(3) })).query(async ({ input }) => getMetadataDetail(input.externalId)),
    refresh: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const items = await getMediaForUser(ctx.user.id);
      const item = items.find((value) => value.id === input.id);
      if (!item?.externalId) return item;
      const detail = await getMetadataDetail(item.externalId);
      if (!detail) return item;
      await updateMediaForUser(ctx.user.id, item.id, detail);
      return (await getMediaForUser(ctx.user.id)).find((value) => value.id === item.id);
    }),
    refreshAll: protectedProcedure.mutation(async ({ ctx }) => {
      const items = await getMediaForUser(ctx.user.id);
      for (const item of items.filter((value) => value.externalId?.startsWith("rawg:") || value.externalId?.startsWith("tmdb:"))) {
        try { const detail = await getMetadataDetail(item.externalId!); if (detail) await updateMediaForUser(ctx.user.id, item.id, detail); } catch (error) { console.warn("[Metadata] Refresh failed", item.externalId, error); }
      }
      return getMediaForUser(ctx.user.id);
    }),
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
    seasonEpisodes: publicProcedure.input(z.object({ externalId: z.string().regex(/^tmdb:tv:\d+$/), seasonNumber: z.number().int().min(1).max(50) })).query(async ({ input }) => {
      if (!ENV.tmdbReadAccessToken && !ENV.tmdbApiKey) return [];
      try { const showId = input.externalId.split(":").pop() ?? ""; const season = await tmdbRequest(`/tv/${showId}/season/${input.seasonNumber}`, { language: "en-US" }); return (season.episodes ?? []).map((episode: any) => ({ seasonNumber: episode.season_number, episodeNumber: episode.episode_number, title: episode.name ?? `Episode ${episode.episode_number}`, airDate: episode.air_date ?? null, runtime: episode.runtime ?? null, overview: episode.overview ?? "", image: episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : "" })); } catch (error) { console.warn("[Metadata] Season fetch failed", error); return []; }
    }),
    episodes: protectedProcedure.input(z.object({ mediaItemId: z.number().int() })).query(({ ctx, input }) => getEpisodesForUser(ctx.user.id, input.mediaItemId)),
    toggleEpisode: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), seasonNumber: z.number().int().min(1), episodeNumber: z.number().int().min(1), title: z.string().optional(), watched: z.boolean() })).mutation(({ ctx, input }) => toggleEpisodeForUser(ctx.user.id, input)),
    logPlaytime: protectedProcedure.input(z.object({ mediaItemId: z.number().int(), startedAt: z.number().int(), endedAt: z.number().int().optional(), minutes: z.number().int().min(1).max(1440), note: z.string().max(500).optional() })).mutation(({ ctx, input }) => addPlaySession(ctx.user.id, { mediaItemId: input.mediaItemId, startedAt: new Date(input.startedAt), endedAt: input.endedAt ? new Date(input.endedAt) : undefined, minutes: input.minutes, note: input.note })),
  }),
});

export type AppRouter = typeof appRouter;
