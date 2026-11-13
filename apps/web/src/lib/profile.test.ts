import { afterEach, describe, expect, it, vi } from "vitest";
import snapshot from "../content/profile.snapshot.json";
import { formatMonth, formatSpan } from "./dates";

vi.mock("next/cache", () => ({ cacheLife: () => undefined }));
const { loadProfile } = await import("./profile");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadProfile", () => {
  it("uses the API when it answers", async () => {
    const live = { ...snapshot, tagline: "From the API." };
    const result = await loadProfile(() => Promise.resolve(Response.json(live)), "http://api");
    expect(result).toEqual({ profile: live, live: true });
  });

  it.each([
    ["the API is down", () => Promise.reject(new TypeError("fetch failed"))],
    ["the API answers 503", () => Promise.resolve(new Response("", { status: 503 }))],
    ["the API answers nonsense", () => Promise.resolve(Response.json({ name: 1 }))],
  ])("falls back to the bundled copy when %s", async (_case, fetcher) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await loadProfile(fetcher, "http://api");
    expect(result).toEqual({ profile: snapshot, live: false });
  });
});

describe("dates", () => {
  it("shows months as the CV does", () => {
    expect(formatMonth("2026-02")).toBe("Feb 2026");
    expect(formatSpan("2024-09", "2026-01")).toBe("Sep 2024 – Jan 2026");
    expect(formatSpan("2026-02", null)).toBe("Feb 2026 – Present");
  });
});
