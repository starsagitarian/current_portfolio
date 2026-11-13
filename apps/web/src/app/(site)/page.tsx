import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { site } from "@starsagitarian/shared";
import { Character } from "@/components/character/Character";
import { GitHubIcon, LinkedInIcon } from "@/components/shell/BrandIcons";
import { SECTIONS } from "@/components/shell/nav";
import "./home.css";

/*
 * Home, after the mockups. Phones: the character, centre stage, in daylight. Tablets: the
 * character on the left at dusk, with a card for each section on the right. Desktops: the
 * introduction and the sections on the left at blue hour, the character on the right.
 */
export default function Home() {
  const [first, ...others] = SECTIONS;
  return (
    <div className="home">
      {/* the character stands on the promenade, fixed to the scene rather than the page */}
      <div className="home-stage" aria-hidden="true">
        <Character pose="standing" />
      </div>

      <section className="home-intro bare rise" aria-labelledby="home-title">
        <h1 id="home-title" className="home-title">
          Hi, I&rsquo;m {site.name.split(" ")[0]}.
        </h1>
        <p className="home-role">{site.title}.</p>
        <p className="home-tagline">{site.tagline}</p>
        <nav aria-label="Explore" className="home-actions">
          {first && (
            <Link href={first.href} className="home-action home-action-primary">
              <first.icon aria-hidden="true" size={20} />
              {first.label}
            </Link>
          )}
          {others.map((item) => (
            <Link key={item.href} href={item.href} className="home-action veil">
              <item.icon aria-hidden="true" size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Profiles" className="home-profiles">
          <a href={site.links.github} rel="me noopener">
            <GitHubIcon size={16} />
            GitHub
          </a>
          <a href={site.links.linkedin} rel="me noopener">
            <LinkedInIcon size={16} />
            LinkedIn
          </a>
        </nav>
      </section>

      <nav aria-label="Explore" className="home-cards">
        {SECTIONS.map((item) => (
          <Link key={item.href} href={item.href} className="home-card surface">
            <item.icon aria-hidden="true" size={30} strokeWidth={1.75} />
            <span>{item.label}</span>
            <ChevronRight aria-hidden="true" size={22} className="home-card-chevron" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
