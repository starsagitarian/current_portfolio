import { Certification, Education, Experience, Profile, Skill } from "../db";

export interface ProfileRecords {
  profile: Profile;
  experiences: Experience[];
  skills: Skill[];
  certifications: Certification[];
  education: Education[];
}

const CURATED = [
  ["sortOrder", "ASC"],
  ["id", "ASC"],
] as [string, string][];

/** Reads the site owner's profile and CV sections. */
export class ProfileRepository {
  async load(): Promise<ProfileRecords | undefined> {
    const [profile, experiences, skills, certifications, education] = await Promise.all([
      Profile.findByPk(1),
      Experience.findAll({ order: CURATED }),
      // Insertion order keeps the categories in the order they were written.
      Skill.findAll({ order: [["id", "ASC"]] }),
      Certification.findAll({ order: CURATED }),
      Education.findAll({ order: CURATED }),
    ]);
    if (profile === null) return undefined;
    return { profile, experiences, skills, certifications, education };
  }
}
