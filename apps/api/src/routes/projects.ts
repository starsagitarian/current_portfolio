import { Router } from "express";
import {
  ProjectDetailSchema,
  ProjectListQuerySchema,
  ProjectListSchema,
  SLUG_PATTERN,
} from "@starsagitarian/shared";
import { HttpError } from "../errors";
import { cacheAsContent } from "../http/cache";
import { parseQuery } from "../http/query";
import type { ProjectService } from "../services/projects";

/**
 * `GET /v1/projects?tag=&q=&page=&pageSize=` lists published projects.
 * `GET /v1/projects/:slug` returns one, with its full write-up.
 */
export function projectsRouter(projects: ProjectService): Router {
  const router = Router();

  router.get("/projects", async (req, res) => {
    const query = parseQuery(ProjectListQuerySchema, req.query);
    const body = ProjectListSchema.parse(await projects.list(query));
    cacheAsContent(res).json(body);
  });

  router.get("/projects/:slug", async (req, res) => {
    const { slug } = req.params;
    const project = SLUG_PATTERN.test(slug) ? await projects.get(slug) : undefined;
    if (project === undefined) {
      throw new HttpError(404, "Not Found", "There is no published project with that slug.");
    }
    cacheAsContent(res).json(ProjectDetailSchema.parse(project));
  });

  return router;
}
