import type { Express } from "express";
import type { Sequelize } from "sequelize";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PROBLEM_CONTENT_TYPE,
  ProblemSchema,
  ProfileSchema,
  ProjectDetailSchema,
  ProjectListSchema,
} from "@starsagitarian/shared";
import { createApp } from "../../src/app";
import { loadConfig } from "../../src/config";
import { connectDatabase, initModels, Profile, Project } from "../../src/db";
import * as content from "../../src/db/seeders/content";
import { profileFromSeed } from "../../src/db/seeders/profile-from-seed";
import { CONTENT_CACHE_CONTROL } from "../../src/http/cache";
import { pdfLines } from "../helpers/pdf";
import { PRIVATE_DETAILS } from "../helpers/profile";
import { connect, resetDatabase, testConfig } from "./helpers";

let sequelize: Sequelize;
let app: Express;

beforeAll(async () => {
  sequelize = connect();
  await resetDatabase(sequelize);
  app = createApp(testConfig({ RATE_LIMIT_PER_MINUTE: "10000" }), { sequelize });
});

afterAll(async () => {
  await sequelize.close();
});

function expectProblem(res: request.Response, status: number) {
  expect(res.status).toBe(status);
  expect(res.headers["content-type"]).toContain(PROBLEM_CONTENT_TYPE);
  expect(res.headers["cache-control"]).toBe("no-store");
  return ProblemSchema.parse(res.body);
}

const seededSlugs = content.projects.map((project) => project.slug);

describe("GET /v1/projects", () => {
  it("lists published projects in their curated order, cached at the CDN", async () => {
    const res = await request(app).get("/v1/projects").expect(200);
    const body = ProjectListSchema.parse(res.body);

    expect(body.items.map((project) => project.slug)).toEqual(seededSlugs);
    expect(body).toMatchObject({ page: 1, pageSize: 12, total: seededSlugs.length, totalPages: 1 });
    expect(res.headers["cache-control"]).toBe(CONTENT_CACHE_CONTROL);
    expect(res.headers.etag).toBeDefined();
  });

  it("answers 304 when the client already has the current version", async () => {
    const first = await request(app).get("/v1/projects").expect(200);
    await request(app)
      .get("/v1/projects")
      .set("If-None-Match", String(first.headers.etag))
      .expect(304);
  });

  it("returns tags and technologies in the order they were written", async () => {
    const res = await request(app).get("/v1/projects").expect(200);
    const lightning = ProjectListSchema.parse(res.body).items.find(
      (project) => project.slug === "lightning-observation",
    );
    const seed = content.projects.find((project) => project.slug === "lightning-observation");

    expect(lightning?.technologies).toEqual(seed?.technologies);
    expect(lightning?.tags).toEqual([
      { slug: "cloud", label: "Cloud" },
      { slug: "data", label: "Data" },
    ]);
  });

  it("filters by tag", async () => {
    const res = await request(app).get("/v1/projects?tag=data").expect(200);
    const body = ProjectListSchema.parse(res.body);
    const expected = content.projects.filter((p) => p.tags.includes("data")).map((p) => p.slug);

    expect(body.items.map((project) => project.slug)).toEqual(expected);
    expect(body.total).toBe(expected.length);
  });

  it("returns nothing for a tag no project has", async () => {
    const res = await request(app).get("/v1/projects?tag=gardening").expect(200);
    expect(ProjectListSchema.parse(res.body)).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });

  it("searches the text, best match first", async () => {
    const res = await request(app).get("/v1/projects?q=lightning").expect(200);
    const body = ProjectListSchema.parse(res.body);

    expect(body.items[0]?.slug).toBe("lightning-observation");
    expect(body.total).toBe(1);
  });

  it("matches word forms and combines search with a tag", async () => {
    const res = await request(app).get("/v1/projects?q=pipeline&tag=cloud").expect(200);
    const slugs = ProjectListSchema.parse(res.body).items.map((project) => project.slug);

    expect(slugs).toContain("book-content-pipelines");
    expect(slugs).not.toContain("dk-learning-microsite");
  });

  it("accepts search syntax and stray punctuation without failing", async () => {
    for (const q of ['"React" -Redux', "AWS OR Shopify", "'; DROP TABLE projects; --", "((("]) {
      const res = await request(app).get("/v1/projects").query({ q }).expect(200);
      ProjectListSchema.parse(res.body);
    }
    expect(await Project.count()).toBe(seededSlugs.length);
  });

  it("pages through the results", async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) => request(app).get(`/v1/projects?pageSize=2&page=${page}`)),
    );
    const bodies = pages.map((res) => ProjectListSchema.parse(res.body));

    expect(bodies[0]).toMatchObject({ total: 7, totalPages: 4, pageSize: 2 });
    expect(bodies.flatMap((body) => body.items.map((project) => project.slug))).toEqual(
      seededSlugs,
    );
    expect(bodies[4]?.items).toEqual([]);
  });

  it("treats empty parameters as absent", async () => {
    const res = await request(app).get("/v1/projects?q=&tag=&page=").expect(200);
    expect(ProjectListSchema.parse(res.body).total).toBe(seededSlugs.length);
  });

  it.each([
    ["page=0", "page"],
    ["page=two", "page"],
    ["pageSize=51", "pageSize"],
    ["tag=Not%20A%20Slug", "tag"],
    ["tag=a&tag=b", "tag"],
    [`q=${"x".repeat(101)}`, "q"],
  ])("rejects %s with a 400 naming the parameter", async (query, parameter) => {
    const res = await request(app).get(`/v1/projects?${query}`);
    expect(expectProblem(res, 400).detail).toContain(`${parameter}:`);
  });
});

describe("GET /v1/projects/:slug", () => {
  it("returns one project with its full write-up", async () => {
    const res = await request(app).get("/v1/projects/book-content-pipelines").expect(200);
    const project = ProjectDetailSchema.parse(res.body);
    const seed = content.projects.find((p) => p.slug === "book-content-pipelines");

    expect(project).toMatchObject({
      title: seed?.title,
      organisation: "DK Publishing",
      body: seed?.body,
      technologies: seed?.technologies,
    });
    expect(res.headers["cache-control"]).toBe(CONTENT_CACHE_CONTROL);
  });

  it.each(["no-such-project", "Not_A_Slug", "a".repeat(200)])(
    "answers 404 for %s",
    async (slug) => {
      const res = await request(app).get(`/v1/projects/${slug}`);
      expectProblem(res, 404);
    },
  );
});

describe("unpublished projects", () => {
  it("hides drafts and future-dated projects from the list and the detail route", async () => {
    await Project.update({ publishedAt: null }, { where: { slug: "remedic" } });
    await Project.update(
      { publishedAt: new Date(Date.now() + 86_400_000) },
      { where: { slug: "saas-data-services" } },
    );
    try {
      const list = ProjectListSchema.parse((await request(app).get("/v1/projects")).body);
      expect(list.items.map((project) => project.slug)).not.toContain("remedic");
      expect(list.items.map((project) => project.slug)).not.toContain("saas-data-services");
      expect(list.total).toBe(seededSlugs.length - 2);

      await request(app).get("/v1/projects/remedic").expect(404);
      await request(app).get("/v1/projects/saas-data-services").expect(404);
    } finally {
      await resetDatabase(sequelize);
    }
  });
});

describe("GET /v1/profile", () => {
  it("returns the résumé with months, grouped skills and links", async () => {
    const res = await request(app).get("/v1/profile").expect(200);
    const profile = ProfileSchema.parse(res.body);

    expect(profile).toMatchObject({ name: "Baiju Joseph", title: "Software & Cloud Engineer" });
    expect(profile.experience.map((job) => job.organisation)).toEqual(
      content.experiences.map((job) => job.organisation),
    );
    expect(profile.experience[0]).toMatchObject({ start: "2026-02", end: "2026-09" });
    expect(profile.skills.map((group) => group.category)).toEqual(Object.keys(content.skills));
    expect(profile.skills[0]?.skills).toEqual(Object.values(content.skills)[0]);
    expect(profile.certifications[0]?.issued).toBe("2025-06");
    expect(profile.links.github).toBe("https://github.com/starsagitarian");
    expect(res.headers["cache-control"]).toBe(CONTENT_CACHE_CONTROL);
  });

  it("serves exactly the seed content, as the web app's fallback copy has it", async () => {
    const res = await request(app).get("/v1/profile").expect(200);
    expect(res.body).toEqual(profileFromSeed());
  });

  it("publishes no email address or phone number", async () => {
    const res = await request(app).get("/v1/profile").expect(200);
    const text = JSON.stringify(res.body);
    for (const [, pattern] of PRIVATE_DETAILS.slice(0, 2)) expect(text).not.toMatch(pattern);
  });
});

describe("GET /v1/profile/cv.pdf", () => {
  it("downloads the CV as a PDF built from the database", async () => {
    const res = await request(app)
      .get("/v1/profile/cv.pdf")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200);
    const pdf = res.body as Buffer;

    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBe("attachment; filename=baiju-joseph-cv.pdf");
    expect(res.headers["cache-control"]).toBe(CONTENT_CACHE_CONTROL);
    expect(pdf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.7");

    const lines = pdfLines(pdf);
    expect(lines[0]).toBe("Baiju Joseph");
    expect(lines.join(" ")).toContain("Scrum Product Owner (Field Apps)");
    for (const [label, pattern] of PRIVATE_DETAILS) {
      for (const line of lines) expect(line, label).not.toMatch(pattern);
    }
  });
});

describe("missing data and outages", () => {
  it("answers 404 when no profile has been set up", async () => {
    await Profile.destroy({ where: {} });
    try {
      expectProblem(await request(app).get("/v1/profile"), 404);
      expectProblem(await request(app).get("/v1/profile/cv.pdf"), 404);
    } finally {
      await resetDatabase(sequelize);
    }
  });

  it("answers 503 without details when the database is unreachable", async () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://nobody:wrong@127.0.0.1:1/none",
    });
    const unreachable = connectDatabase(config);
    try {
      const down = createApp(config, { sequelize: unreachable });
      const res = await request(down).get("/v1/projects");

      expect(expectProblem(res, 503).detail).toBe("The database is unreachable.");
      expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|nobody/);
    } finally {
      await unreachable?.close();
      // Bind the models back to the test database.
      initModels(sequelize);
    }
  });
});
