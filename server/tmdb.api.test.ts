import { describe, expect, it } from "vitest";

describe("TMDB credentials", () => {
  it("authenticates against the lightweight configuration endpoint", async () => {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY;
    expect(token).toBeTruthy();
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.themoviedb.org/3/configuration", {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    expect(response.ok).toBe(true);
    const body = await response.json() as { images?: { secure_base_url?: string } };
    expect(body.images?.secure_base_url).toContain("https://");
  }, 15000);

  it("can reach movie, TV, and episode metadata endpoints", async () => {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };
    const movieResponse = await fetch("https://api.themoviedb.org/3/search/movie?query=Inception&language=en-US", { headers });
    const tvResponse = await fetch("https://api.themoviedb.org/3/search/tv?query=The%20Last%20of%20Us&language=en-US", { headers });
    expect(movieResponse.ok).toBe(true);
    expect(tvResponse.ok).toBe(true);
    const tvBody = await tvResponse.json() as { results?: Array<{ id: number }> };
    const showId = tvBody.results?.[0]?.id;
    expect(showId).toBeTypeOf("number");
    const showResponse = await fetch(`https://api.themoviedb.org/3/tv/${showId}?language=en-US`, { headers });
    expect(showResponse.ok).toBe(true);
    const show = await showResponse.json() as { seasons?: Array<{ season_number: number }> };
    const season = show.seasons?.find((entry) => entry.season_number > 0)?.season_number;
    expect(season).toBeTypeOf("number");
    const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${season}?language=en-US`, { headers });
    expect(seasonResponse.ok).toBe(true);
  }, 20000);
});
