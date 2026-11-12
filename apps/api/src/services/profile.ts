import { site, type Profile, type SkillGroup } from "@starsagitarian/shared";
import type { Skill } from "../db";
import type { ProfileRepository } from "../repositories/profile";

/** `YYYY-MM-DD` to `YYYY-MM`: the site shows months, not days. */
const toMonth = (date: string) => date.slice(0, 7);

function groupSkills(skills: Skill[]): SkillGroup[] {
  const groups = new Map<string, Skill[]>();
  for (const skill of skills) {
    const group = groups.get(skill.category) ?? [];
    group.push(skill);
    groups.set(skill.category, group);
  }
  return [...groups].map(([category, members]) => ({
    category,
    skills: members.sort((a, b) => a.sortOrder - b.sortOrder).map((skill) => skill.name),
  }));
}

/** Builds the public profile: the résumé page and the CV PDF both come from it. */
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async get(): Promise<Profile | undefined> {
    const records = await this.repository.load();
    if (records === undefined) return undefined;
    const { profile, experiences, skills, certifications, education } = records;

    return {
      name: profile.name,
      title: profile.title,
      location: profile.location,
      tagline: profile.tagline,
      summary: profile.summary,
      links: { website: site.url, ...site.links },
      experience: experiences.map((item) => ({
        organisation: item.organisation,
        role: item.role,
        location: item.location,
        start: toMonth(item.startDate),
        end: item.endDate === null ? null : toMonth(item.endDate),
        highlights: item.highlights,
      })),
      skills: groupSkills(skills),
      certifications: certifications.map((item) => ({
        name: item.name,
        issuer: item.issuer,
        issued: toMonth(item.issuedOn),
        credentialUrl: item.credentialUrl,
      })),
      education: education.map((item) => ({
        institution: item.institution,
        qualification: item.qualification,
        location: item.location,
        endYear: item.endYear,
      })),
    };
  }
}
