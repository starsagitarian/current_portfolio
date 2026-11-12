import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { encodeWinAnsi, literalString, textString } from "./encoding";
import { FIRST_CODE, WIDTHS } from "./metrics";

/*
 * A small PDF 1.7 writer for text documents. It uses the standard Helvetica fonts, which every
 * PDF reader has built in, so nothing is embedded and a two-page CV comes to a few kilobytes.
 * Coordinates are in points from the top-left corner of the page.
 */

export type FontName = keyof typeof WIDTHS;
export type Rgb = readonly [number, number, number];

export interface TextStyle {
  font: FontName;
  size: number;
  color?: Rgb;
  /** Extra space after each character, in points. */
  charSpacing?: number;
}

export interface DocumentInfo {
  title: string;
  author: string;
  subject?: string;
  /** BCP 47 language tag, for screen readers. */
  lang: string;
}

/** A4 in points. */
export const A4 = { width: 595.28, height: 841.89 } as const;

const FONT_RESOURCES: Record<FontName, string> = { Helvetica: "F1", "Helvetica-Bold": "F2" };

/** Numbers as PDF writes them: at most two decimals, no trailing zeros. */
function num(value: number): string {
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function widthOfCodes(codes: number[], style: TextStyle): number {
  const widths = WIDTHS[style.font];
  let units = 0;
  for (const code of codes) units += widths[code - FIRST_CODE] ?? 0;
  return (units * style.size) / 1000 + (style.charSpacing ?? 0) * codes.length;
}

/** The width of a line of text in points. */
export function measure(text: string, style: TextStyle): number {
  return widthOfCodes(encodeWinAnsi(text), style);
}

/** Breaks text into lines no wider than maxWidth, at spaces where possible. */
export function wrap(text: string, style: TextStyle, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (measure(candidate, style) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line !== "") lines.push(line);
    line = word;
    // A word wider than the line (a long URL, say) is split wherever it has to be.
    while (measure(line, style) > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && measure(line.slice(0, cut), style) > maxWidth) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

interface Link {
  rect: [number, number, number, number];
  uri: string;
}

export class PdfPage {
  readonly operations: string[] = [];
  readonly links: Link[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  /** Draws one line of text with its baseline at y. Returns the width drawn. */
  text(text: string, x: number, y: number, style: TextStyle): number {
    const codes = encodeWinAnsi(text);
    const [r, g, b] = style.color ?? [0, 0, 0];
    this.operations.push(
      `BT /${FONT_RESOURCES[style.font]} ${num(style.size)} Tf ${num(style.charSpacing ?? 0)} Tc ` +
        `${num(r)} ${num(g)} ${num(b)} rg ${num(x)} ${num(this.height - y)} Td ${literalString(codes)} Tj ET`,
    );
    return widthOfCodes(codes, style);
  }

  line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Rgb): void {
    const [r, g, b] = color;
    this.operations.push(
      `${num(r)} ${num(g)} ${num(b)} RG ${num(thickness)} w ` +
        `${num(x1)} ${num(this.height - y1)} m ${num(x2)} ${num(this.height - y2)} l S`,
    );
  }

  /** Makes a box clickable, opening the URI. top is the y of its upper edge. */
  link(x: number, top: number, width: number, height: number, uri: string): void {
    this.links.push({
      rect: [x, this.height - top - height, x + width, this.height - top],
      uri,
    });
  }
}

export class PdfDocument {
  readonly pages: PdfPage[] = [];

  constructor(
    private readonly info: DocumentInfo,
    private readonly size: { width: number; height: number } = A4,
  ) {}

  addPage(): PdfPage {
    const page = new PdfPage(this.size.width, this.size.height);
    this.pages.push(page);
    return page;
  }

  /** Serialises the document. The same content always gives the same bytes. */
  toBuffer(): Buffer {
    const objects: (string | Buffer)[] = [];
    const add = (body: string | Buffer) => objects.push(body);

    const CATALOG = add("");
    const PAGES = add("");
    const INFO = add(
      `<< /Title ${textString(this.info.title)} /Author ${textString(this.info.author)}` +
        (this.info.subject === undefined ? "" : ` /Subject ${textString(this.info.subject)}`) +
        " >>",
    );
    const fontRefs = Object.entries(FONT_RESOURCES).map(([font, resource]) => {
      const ref = add(
        `<< /Type /Font /Subtype /Type1 /BaseFont /${font} /Encoding /WinAnsiEncoding >>`,
      );
      return `/${resource} ${ref} 0 R`;
    });

    const pageRefs = this.pages.map((page) => {
      const content = deflateSync(Buffer.from(page.operations.join("\n"), "latin1"));
      const contents = add(
        Buffer.concat([
          Buffer.from(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"),
          content,
          Buffer.from("\nendstream", "latin1"),
        ]),
      );
      const annotations = page.links.map(({ rect, uri }) =>
        add(
          `<< /Type /Annot /Subtype /Link /Rect [${rect.map(num).join(" ")}] /Border [0 0 0] ` +
            `/A << /Type /Action /S /URI /URI ${literalString(encodeWinAnsi(uri))} >> >>`,
        ),
      );
      return add(
        `<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
          `/Resources << /Font << ${fontRefs.join(" ")} >> >> /Contents ${contents} 0 R` +
          (annotations.length > 0
            ? ` /Annots [${annotations.map((a) => `${a} 0 R`).join(" ")}]`
            : "") +
          " >>",
      );
    });

    objects[CATALOG - 1] =
      `<< /Type /Catalog /Pages ${PAGES} 0 R /Lang ${literalString(encodeWinAnsi(this.info.lang))} ` +
      "/ViewerPreferences << /DisplayDocTitle true >> >>";
    objects[PAGES - 1] =
      `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

    // Header, with a comment of high bytes that marks the file as binary.
    const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n", "latin1")];
    let length = chunks[0]?.length ?? 0;
    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(length);
      const chunk = Buffer.concat([
        Buffer.from(`${index + 1} 0 obj\n`, "latin1"),
        typeof body === "string" ? Buffer.from(body, "latin1") : body,
        Buffer.from("\nendobj\n", "latin1"),
      ]);
      chunks.push(chunk);
      length += chunk.length;
    });

    const id = createHash("md5").update(Buffer.concat(chunks)).digest("hex");
    const xref = [
      "xref",
      `0 ${objects.length + 1}`,
      "0000000000 65535 f ",
      ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
      "trailer",
      `<< /Size ${objects.length + 1} /Root ${CATALOG} 0 R /Info ${INFO} 0 R /ID [<${id}> <${id}>] >>`,
      "startxref",
      String(length),
      "%%EOF",
      "",
    ].join("\n");
    chunks.push(Buffer.from(xref, "latin1"));
    return Buffer.concat(chunks);
  }
}
