import { z } from "zod";

/** Lower-case words joined by hyphens, as stored for project and tag slugs. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A month as `YYYY-MM`: the site shows dates to the month only. */
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const TagSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN),
  label: z.string(),
});

export const ProjectSummarySchema = z.object({
  slug: z.string().regex(SLUG_PATTERN),
  title: z.string(),
  organisation: z.string().nullable(),
  summary: z.string(),
  featured: z.boolean(),
  tags: z.array(TagSchema),
  technologies: z.array(z.string()),
  repoUrl: z.url().nullable(),
  liveUrl: z.url().nullable(),
  coverImage: z.string().nullable(),
  publishedAt: z.iso.datetime(),
});

export const ProjectDetailSchema = ProjectSummarySchema.extend({
  /** Plain text; paragraphs are separated by a blank line. */
  body: z.string(),
});

export const PROJECTS_PAGE_SIZE = { default: 12, max: 50 } as const;

/** Treats an empty query parameter (`?q=`) the same as a missing one. */
const optionalParam = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

export const ProjectListQuerySchema = z.object({
  tag: optionalParam(z.string().regex(SLUG_PATTERN, "must be a tag slug").max(40)),
  q: optionalParam(z.string().trim().min(1).max(100)),
  page: optionalParam(z.coerce.number().int().min(1).max(1000)).default(1),
  pageSize: optionalParam(z.coerce.number().int().min(1).max(PROJECTS_PAGE_SIZE.max)).default(
    PROJECTS_PAGE_SIZE.default,
  ),
});

export const ProjectListSchema = z.object({
  items: z.array(ProjectSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const ExperienceSchema = z.object({
  organisation: z.string(),
  role: z.string(),
  location: z.string(),
  start: MonthSchema,
  /** Null while the role is current. */
  end: MonthSchema.nullable(),
  highlights: z.array(z.string()),
});

export const SkillGroupSchema = z.object({
  category: z.string(),
  skills: z.array(z.string()),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issued: MonthSchema,
  credentialUrl: z.url().nullable(),
});

export const EducationSchema = z.object({
  institution: z.string(),
  qualification: z.string(),
  location: z.string().nullable(),
  endYear: z.number().int().nullable(),
});

export const ProfileSchema = z.object({
  name: z.string(),
  title: z.string(),
  location: z.string(),
  tagline: z.string(),
  summary: z.string(),
  links: z.object({ website: z.url(), github: z.url(), linkedin: z.url() }),
  experience: z.array(ExperienceSchema),
  skills: z.array(SkillGroupSchema),
  certifications: z.array(CertificationSchema),
  education: z.array(EducationSchema),
});

export type Tag = z.infer<typeof TagSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
