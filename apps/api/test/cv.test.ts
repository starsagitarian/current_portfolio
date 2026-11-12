import { describe, expect, it } from "vitest";
import { displayUrl, formatMonth, renderCv } from "../src/cv/render-cv";
import { cvFileName } from "../src/routes/profile";
import { pdfLines, pdfLinks } from "./helpers/pdf";
import { PRIVATE_DETAILS, seedProfile } from "./helpers/profile";

describe("renderCv", () => {
  const profile = seedProfile();
  const pdf = renderCv(profile);
  const lines = pdfLines(pdf);
  const text = lines.join(" ");

  it("presents the profile, every role and every section", () => {
    expect(lines[0]).toBe(profile.name);
    expect(lines[1]).toBe(profile.title);
    for (const heading of ["PROFILE", "EXPERIENCE", "SKILLS", "CERTIFICATIONS", "EDUCATION"]) {
      expect(lines).toContain(heading);
    }
    for (const job of profile.experience) expect(text).toContain(job.role);
    for (const cert of profile.certifications) expect(text).toContain(cert.name);
    expect(text).toContain("Feb 2026 – Sep 2026");
  });

  it("links to the website, GitHub and LinkedIn", () => {
    expect(pdfLinks(pdf)).toEqual([
      profile.links.website,
      profile.links.github,
      profile.links.linkedin,
    ]);
  });

  it.each(PRIVATE_DETAILS)("contains no %s", (_label, pattern) => {
    for (const line of lines) expect(line).not.toMatch(pattern);
  });

  it("numbers its pages", () => {
    const pages = lines.filter((line) => /^Page \d+ of \d+$/.test(line));
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.at(-1)).toBe(`Page ${pages.length} of ${pages.length}`);
  });

  it("produces the same file for the same profile", () => {
    expect(renderCv(profile).equals(pdf)).toBe(true);
  });
});

describe("CV helpers", () => {
  it("formats months and URLs for print", () => {
    expect(formatMonth("2026-02")).toBe("Feb 2026");
    expect(displayUrl("https://www.linkedin.com/in/someone/")).toBe("linkedin.com/in/someone");
  });

  it("names the download after the person", () => {
    expect(cvFileName("Baiju Joseph")).toBe("baiju-joseph-cv.pdf");
    expect(cvFileName("Zoë O'Brien")).toBe("zoe-o-brien-cv.pdf");
    expect(cvFileName("!!!")).toBe("cv.pdf");
  });
});
