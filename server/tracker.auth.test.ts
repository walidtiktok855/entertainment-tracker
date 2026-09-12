import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("tracker authorization", () => {
  it("protects personal library reads", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tracker.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects episode and playtime writes", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tracker.toggleEpisode({ mediaItemId: 1, seasonNumber: 1, episodeNumber: 1, watched: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.logPlaytime({ mediaItemId: 1, startedAt: Date.now(), minutes: 45 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects metadata refresh mutations", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tracker.refreshAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.refresh({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects Screenshot Cemetery reads, saves, preferences, and promotion", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tracker.cemetery()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.quickAdd({ sourceLink: "https://example.com" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.cemeteryDefault()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.setCemeteryDefault({ category: "Game" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.tracker.promote({ id: 1, item: { type: "Game", status: "Want to play" } })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
