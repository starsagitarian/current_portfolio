import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Award,
  Briefcase,
  Download,
  GraduationCap,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/character/Avatar";
import { SceneFigure } from "@/components/character/SceneFigure";
import { formatMonth } from "@/lib/dates";
import { getProfile } from "@/lib/profile";
import "@/components/page/page.css";
import "./resume.css";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "Experience, skills, certifications and education of Baiju Joseph, software and cloud engineer in London.",
};

function Section({
  icon: Icon,
  id,
  title,
  children,
}: {
  icon: LucideIcon;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="resume-section" aria-labelledby={id}>
      <h2 id={id} className="section-title reveal">
        <Icon aria-hidden="true" size={22} strokeWidth={2} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function When({ month }: { month: string | null }) {
  return month === null ? "Present" : <time dateTime={month}>{formatMonth(month)}</time>;
}

/**
 * The résumé, from GET /v1/profile (or the copy bundled with the site when the API cannot be
 * reached). The introduction sits bare on the painting; the reading sits on dissolving glass.
 */
export default async function ResumePage() {
  const { profile } = await getProfile();

  return (
    <div className="resume">
      {/* on wide screens, Baiju stands on the promenade in the clear space beside the reading */}
      <SceneFigure media="(min-width: 1600px)" className="page-figure" />
      <div className="page-intro resume-intro bare rise">
        <Avatar size={104} className="resume-avatar" />
        <div>
          <h1 className="page-title">Résumé</h1>
          <p className="page-lede">
            {profile.title} · {profile.location}
          </p>
          <div className="page-actions">
            <a className="button button-gold" href="/resume/cv.pdf" download>
              <Download aria-hidden="true" size={20} />
              Download CV
            </a>
            <span className="resume-cv-note">PDF, A4, two pages</span>
          </div>
        </div>
      </div>

      <div className="resume-grid">
        <div className="dissolve resume-main">
          <Section icon={UserRound} id="about" title="About me">
            <p className="resume-about reveal">{profile.summary}</p>
          </Section>

          <Section icon={Briefcase} id="experience" title="Experience">
            <ol className="timeline">
              {profile.experience.map((job) => (
                <li key={`${job.organisation}-${job.start}`} className="timeline-entry reveal">
                  <div className="timeline-head">
                    <h3 className="timeline-role">{job.role}</h3>
                    <p className="timeline-when">
                      <When month={job.start} /> – <When month={job.end} />
                    </p>
                  </div>
                  <p className="timeline-where">
                    {job.organisation} · {job.location}
                  </p>
                  <ul className="timeline-highlights">
                    {job.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="dissolve resume-side">
          <Section icon={Sparkles} id="skills" title="Skills">
            {profile.skills.map((group) => (
              <div key={group.category} className="skill-group reveal">
                <h3 className="skill-category">{group.category}</h3>
                <ul className="chips">
                  {group.skills.map((skill) => (
                    <li key={skill} className="chip">
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section icon={Award} id="certifications" title="Certifications">
            <ul className="facts">
              {profile.certifications.map((cert) => (
                <li key={cert.name} className="reveal">
                  <span className="fact-name">{cert.name}</span>
                  <span className="fact-meta">
                    {cert.issuer} · <When month={cert.issued} />
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={GraduationCap} id="education" title="Education">
            <ul className="facts">
              {profile.education.map((item) => (
                <li key={item.qualification} className="reveal">
                  <span className="fact-name">{item.qualification}</span>
                  <span className="fact-meta">
                    {[item.institution, item.location, item.endYear].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
