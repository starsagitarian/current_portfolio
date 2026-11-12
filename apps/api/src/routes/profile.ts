import { Router } from "express";
import { ProfileSchema, type Profile } from "@starsagitarian/shared";
import { renderCv } from "../cv/render-cv";
import { HttpError } from "../errors";
import { cacheAsContent } from "../http/cache";
import type { ProfileService } from "../services/profile";

async function loadProfile(profiles: ProfileService): Promise<Profile> {
  const profile = await profiles.get();
  if (profile === undefined) throw new HttpError(404, "Not Found", "No profile has been set up.");
  return ProfileSchema.parse(profile);
}

/** File name for the download: `Baiju Joseph` becomes `baiju-joseph-cv.pdf`. */
export function cvFileName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug === "" ? "cv.pdf" : `${slug}-cv.pdf`;
}

/**
 * `GET /v1/profile` is the résumé as JSON.
 * `GET /v1/profile/cv.pdf` is the same content as a downloadable PDF.
 */
export function profileRouter(profiles: ProfileService): Router {
  const router = Router();

  router.get("/profile", async (_req, res) => {
    cacheAsContent(res).json(await loadProfile(profiles));
  });

  router.get("/profile/cv.pdf", async (_req, res) => {
    const profile = await loadProfile(profiles);
    cacheAsContent(res)
      .attachment(cvFileName(profile.name))
      .type("application/pdf")
      .send(renderCv(profile));
  });

  return router;
}
