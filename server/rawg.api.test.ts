import { describe, expect, it } from "vitest";

describe("RAWG API credential", () => {
  it("authenticates against the lightweight games endpoint", async () => {
    const key = process.env.RAWG_API_KEY;
    expect(key).toBeTruthy();

    const response = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(key ?? "")}&search=portal&page_size=1`);
    expect(response.ok).toBe(true);
    const body = await response.json() as { results?: unknown[] };
    expect(Array.isArray(body.results)).toBe(true);
  }, 15000);
});
