import type { Profile } from "@starsagitarian/shared";
import {
  measure,
  PdfDocument,
  wrap,
  type PdfPage,
  type Rgb,
  type TextStyle,
} from "../pdf/document";

/*
 * The CV as an A4 PDF, drawn from the same profile the résumé page shows. It carries only what
 * the site already publishes: no phone number, no email address and no postal address.
 */

const INK: Rgb = [0.11, 0.13, 0.2];
const ACCENT: Rgb = [0.56, 0.4, 0.2];
const MUTED: Rgb = [0.4, 0.42, 0.48];
const RULE: Rgb = [0.82, 0.83, 0.86];

const MARGIN = { top: 50, right: 54, bottom: 62, left: 54 };
const LEADING = 13.5;
/** Space above each role in the experience section. */
const ENTRY_GAP = 16;

const body: TextStyle = { font: "Helvetica", size: 9.5, color: INK };
const bold: TextStyle = { font: "Helvetica-Bold", size: 9.5, color: INK };
const muted: TextStyle = { font: "Helvetica", size: 9, color: MUTED };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-02` as `Feb 2026`. */
export function formatMonth(month: string): string {
  const [year, index] = month.split("-");
  return `${MONTHS[Number(index) - 1] ?? ""} ${year ?? ""}`.trim();
}

/** A URL as people read it: no scheme, no www, no trailing slash. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** Keeps track of the page and the vertical position, starting new pages as needed. */
class Layout {
  page: PdfPage;
  y = MARGIN.top;
  readonly left = MARGIN.left;
  readonly right: number;

  constructor(readonly doc: PdfDocument) {
    this.page = doc.addPage();
    this.right = this.page.width - MARGIN.right;
  }

  get width(): number {
    return this.right - this.left;
  }

  /** The writing height of a whole page. */
  pageSpace(): number {
    return this.page.height - MARGIN.top - MARGIN.bottom;
  }

  /** Starts a new page unless `height` more points fit on this one. */
  ensure(height: number): void {
    if (this.y + height <= this.page.height - MARGIN.bottom) return;
    this.page = this.doc.addPage();
    this.y = MARGIN.top;
  }

  /** Moves down one line and returns the new baseline. */
  advance(leading: number): number {
    this.ensure(leading);
    this.y += leading;
    return this.y;
  }

  paragraph(text: string, style: TextStyle, leading: number, indent = 0): void {
    for (const line of wrap(text, style, this.width - indent)) {
      this.page.text(line, this.left + indent, this.advance(leading), style);
    }
  }

  /** Text that ends at the right margin, on the current baseline. */
  textRight(text: string, style: TextStyle): number {
    const width = measure(text, style);
    this.page.text(text, this.right - width, this.y, style);
    return width;
  }

  rule(thickness: number): void {
    this.page.line(this.left, this.y, this.right, this.y, thickness, RULE);
  }

  section(title: string, keepWith: number): void {
    // Keep a heading on the same page as the start of its section.
    this.ensure(32 + keepWith);
    this.y += 24;
    this.page.text(title.toUpperCase(), this.left, this.y, {
      font: "Helvetica-Bold",
      size: 9,
      color: ACCENT,
      charSpacing: 1.2,
    });
    this.y += 6;
    this.rule(0.5);
    this.y += 2;
  }
}

function header(layout: Layout, profile: Profile): void {
  const { page } = layout;
  page.text(profile.name, layout.left, layout.advance(24), {
    font: "Helvetica-Bold",
    size: 24,
    color: INK,
  });
  page.text(profile.title, layout.left, layout.advance(19), {
    font: "Helvetica",
    size: 12.5,
    color: ACCENT,
  });

  // Location and links on one line, wrapping between items if they do not fit.
  const items: { text: string; url?: string }[] = [
    { text: profile.location },
    ...[profile.links.website, profile.links.github, profile.links.linkedin].map((url) => ({
      text: displayUrl(url),
      url,
    })),
  ];
  const separator = "   ·   ";
  const separatorWidth = measure(separator, muted);
  let x = layout.left;
  layout.advance(17);
  items.forEach((item, index) => {
    const width = measure(item.text, muted);
    if (index > 0) {
      if (x + separatorWidth + width > layout.right) {
        x = layout.left;
        layout.advance(13);
      } else {
        x += page.text(separator, x, layout.y, muted);
      }
    }
    page.text(item.text, x, layout.y, muted);
    if (item.url !== undefined)
      page.link(x, layout.y - muted.size, width, muted.size + 3, item.url);
    x += width;
  });

  layout.y += 12;
  layout.rule(0.75);
}

function experience(layout: Layout, profile: Profile): void {
  layout.section("Experience", 60);
  for (const job of profile.experience) {
    const dates = `${formatMonth(job.start)} – ${job.end === null ? "Present" : formatMonth(job.end)}`;
    const roleStyle: TextStyle = { ...bold, size: 10.5 };
    const roleLines = wrap(job.role, roleStyle, layout.width - measure(dates, muted) - 16);
    const bulletLines = job.highlights.map((text) => wrap(text, body, layout.width - 12));

    // Keep a role on one page; only a role longer than a page is split.
    const height = ENTRY_GAP + roleLines.length * 14 + 15 + bulletLines.flat().length * LEADING;
    layout.ensure(Math.min(height, layout.pageSpace()));
    layout.y += ENTRY_GAP;
    roleLines.forEach((line, index) => {
      layout.page.text(line, layout.left, layout.advance(index === 0 ? 2 : 14), roleStyle);
      if (index === 0) layout.textRight(dates, muted);
    });
    layout.page.text(`${job.organisation}  ·  ${job.location}`, layout.left, layout.advance(13), {
      ...body,
      color: ACCENT,
    });
    layout.y += 2;

    for (const lines of bulletLines) {
      lines.forEach((line, index) => {
        const baseline = layout.advance(LEADING);
        if (index === 0)
          layout.page.text("•", layout.left + 2, baseline, { ...body, color: MUTED });
        layout.page.text(line, layout.left + 12, baseline, body);
      });
    }
  }
}

function skills(layout: Layout, profile: Profile): void {
  layout.section("Skills", 2 * LEADING);
  const labelWidth = 138;
  for (const group of profile.skills) {
    const labels = wrap(group.category, bold, labelWidth - 10);
    const values = wrap(group.skills.join(", "), body, layout.width - labelWidth);
    const rows = Math.max(labels.length, values.length);
    layout.ensure(rows * LEADING + 4);
    layout.y += 4;
    for (let row = 0; row < rows; row++) {
      const baseline = layout.advance(LEADING);
      const label = labels[row];
      const value = values[row];
      if (label !== undefined) layout.page.text(label, layout.left, baseline, bold);
      if (value !== undefined) layout.page.text(value, layout.left + labelWidth, baseline, body);
    }
  }
}

function certifications(layout: Layout, profile: Profile): void {
  layout.section("Certifications", 2 * LEADING);
  layout.y += 4;
  for (const cert of profile.certifications) {
    const issued = `${cert.issuer}, ${formatMonth(cert.issued)}`;
    const names = wrap(cert.name, bold, layout.width - measure(issued, muted) - 16);
    names.forEach((line, index) => {
      const baseline = layout.advance(LEADING);
      const width = layout.page.text(line, layout.left, baseline, bold);
      if (cert.credentialUrl !== null) {
        layout.page.link(
          layout.left,
          baseline - bold.size,
          width,
          bold.size + 3,
          cert.credentialUrl,
        );
      }
      if (index === 0) layout.textRight(issued, muted);
    });
  }
}

function education(layout: Layout, profile: Profile): void {
  layout.section("Education", 2 * LEADING);
  for (const item of profile.education) {
    layout.ensure(4 + 2 * LEADING);
    layout.y += 4;
    layout.page.text(item.qualification, layout.left, layout.advance(LEADING), bold);
    if (item.endYear !== null) layout.textRight(String(item.endYear), muted);
    const place = [item.institution, item.location].filter(Boolean).join(", ");
    layout.page.text(place, layout.left, layout.advance(LEADING), { ...body, color: MUTED });
  }
}

function footers(doc: PdfDocument, profile: Profile): void {
  const style: TextStyle = { font: "Helvetica", size: 8, color: MUTED };
  doc.pages.forEach((page, index) => {
    const y = page.height - 34;
    page.text(`${profile.name}  ·  ${profile.title}`, MARGIN.left, y, style);
    const label = `Page ${index + 1} of ${doc.pages.length}`;
    page.text(label, page.width - MARGIN.right - measure(label, style), y, style);
  });
}

/** Renders the CV as PDF bytes. The same profile always gives the same file. */
export function renderCv(profile: Profile): Buffer {
  const doc = new PdfDocument({
    title: `${profile.name} – CV`,
    author: profile.name,
    subject: profile.title,
    lang: "en-GB",
  });
  const layout = new Layout(doc);

  header(layout, profile);
  layout.section("Profile", 3 * 14);
  layout.y += 2;
  layout.paragraph(profile.summary, { ...body, size: 10 }, 14.5);
  experience(layout, profile);
  skills(layout, profile);
  certifications(layout, profile);
  education(layout, profile);
  footers(doc, profile);

  return doc.toBuffer();
}
