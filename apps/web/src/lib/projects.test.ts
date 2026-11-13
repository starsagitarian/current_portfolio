import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSummarySchema } from "@starsagitarian/shared";
import snapshot from "../content/projects.snapshot.json";

vi.mock("next/cache", () => ({ cacheLife: () => undefined }));
const { loadProject, loadProjects, tagsInUse } = await import("./projects");

afterEach(() => {
  vi.restoreAllMocks();
});

const summaries = snapshot.map((project) => ProjectSummarySchema.parse(project));
const list = (items: unknown[]) =>
  Response.json({ items, page: 1, pageSize: 50, total: items.length, totalPages: 1 });

const failures: [string, () => Promise<Response>][] = [
  ["the API is down", () => Promise.reject(new TypeError("fetch failed"))],
  ["the API answers 503", () => Promise.resolve(new Response("", { status: 503 }))],
  ["the API answers nonsense", () => Promise.resolve(Response.json({ items: [{ slug: 1 }] }))],
];

describe("loadProjects", () => {
  it("uses the API when it answers, asking for every project at once", async () => {
    const fetcher = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(list(summaries.slice(0, 2))),
    );
    const result = await loadProjects(fetcher, "http://api");
    expect(result).toEqual({ projects: summaries.slice(0, 2), live: true });
    expect(fetcher).toHaveBeenCalledWith("http://api/v1/projects?pageSize=50");
  });

  it.each(failures)("falls back to the bundled list when %s", async (_case, fetcher) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await loadProjects(fetcher, "http://api")).toEqual({ projects: summaries, live: false });
  });
});

describe("loadProject", () => {
  const lightning = snapshot.find((project) => project.slug === "lightning-observation");

  it("uses the API when it answers", async () => {
    const live = { ...lightning, title: "From the API" };
    const result = await loadProject(
      () => Promise.resolve(Response.json(live)),
      "http://api",
      "lightning-observation",
    );
    expect(result).toEqual(live);
  });

  it("trusts the API when it says there is no such project", async () => {
    const result = await loadProject(
      () => Promise.resolve(new Response("", { status: 404 })),
      "http://api",
      "lightning-observation",
    );
    expect(result).toBeNull();
  });

  it.each(failures)("falls back to the bundled copy when %s", async (_case, fetcher) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await loadProject(fetcher, "http://api", "lightning-observation")).toEqual(lightning);
    expect(await loadProject(fetcher, "http://api", "not-bundled")).toBeNull();
  });
});

describe("tagsInUse", () => {
  it("lists each tag once, A to Z, with its count", () => {
    expect(tagsInUse(summaries)).toEqual([
      { slug: "cloud", label: "Cloud", count: 5 },
      { slug: "data", label: "Data", count: 3 },
      { slug: "web", label: "Web", count: 4 },
    ]);
  });
});
