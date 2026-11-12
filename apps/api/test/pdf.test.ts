import { describe, expect, it } from "vitest";
import { decodeWinAnsi, encodeWinAnsi, literalString, textString } from "../src/pdf/encoding";
import { measure, PdfDocument, wrap, type TextStyle } from "../src/pdf/document";
import { pdfLines, pdfLinks } from "./helpers/pdf";

const style: TextStyle = { font: "Helvetica", size: 10 };

describe("WinAnsi encoding", () => {
  it("keeps ASCII and Latin-1, maps typographic marks and replaces the rest", () => {
    expect(encodeWinAnsi("A é")).toEqual([0x41, 0x20, 0xe9]);
    expect(encodeWinAnsi("– • ’")).toEqual([0x96, 0x20, 0x95, 0x20, 0x92]);
    expect(encodeWinAnsi("→")).toEqual([0x3f]);
  });

  it("round-trips through decodeWinAnsi", () => {
    const text = "Café – “quoted” • 100€";
    expect(decodeWinAnsi(encodeWinAnsi(text))).toBe(text);
  });

  it("escapes brackets, backslashes and high bytes in literal strings", () => {
    expect(literalString(encodeWinAnsi("a(b)c\\d"))).toBe("(a\\(b\\)c\\\\d)");
    expect(literalString(encodeWinAnsi("–"))).toBe("(\\226)");
  });

  it("writes metadata as UTF-16 with a byte-order mark", () => {
    expect(textString("A–")).toBe("<FEFF00412013>");
  });
});

describe("text layout", () => {
  it("measures with the Helvetica metrics", () => {
    // "A" is 667/1000 em and a space 278/1000 em.
    expect(measure("A A", style)).toBeCloseTo((667 * 2 + 278) / 100, 5);
    expect(measure("AAA", { ...style, charSpacing: 1 })).toBeCloseTo(20.01 + 3, 5);
  });

  it("wraps at spaces without exceeding the width", () => {
    const text = "the quick brown fox jumps over the lazy dog ".repeat(4).trim();
    const lines = wrap(text, style, 120);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) expect(measure(line, style)).toBeLessThanOrEqual(120);
  });

  it("splits a word that is wider than the line", () => {
    const word = "x".repeat(80);
    const lines = wrap(word, style, 100);

    expect(lines.join("")).toBe(word);
    for (const line of lines) expect(measure(line, style)).toBeLessThanOrEqual(100);
  });
});

describe("PdfDocument", () => {
  function sample(): Buffer {
    const doc = new PdfDocument({ title: "Test – doc", author: "Someone", lang: "en-GB" });
    const first = doc.addPage();
    first.text("Hello (world)", 50, 60, style);
    first.link(50, 50, 80, 12, "https://example.com/a");
    first.line(50, 70, 200, 70, 0.5, [0.5, 0.5, 0.5]);
    doc.addPage().text("Second – page", 50, 60, { font: "Helvetica-Bold", size: 12 });
    return doc.toBuffer();
  }

  it("writes a well-formed file whose cross-reference table points at every object", () => {
    const pdf = sample();
    const raw = pdf.toString("latin1");

    expect(raw.startsWith("%PDF-1.7\n")).toBe(true);
    expect(raw.endsWith("%%EOF\n")).toBe(true);

    const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(raw)?.[1]);
    expect(raw.slice(startxref, startxref + 4)).toBe("xref");

    const [, first, count] = /xref\n(\d+) (\d+)\n/.exec(raw.slice(startxref)) ?? [];
    expect(Number(first)).toBe(0);
    const entries = raw
      .slice(startxref)
      .split("\n")
      .slice(3, 2 + Number(count));
    entries.forEach((entry, index) => {
      expect(entry).toMatch(/^\d{10} 00000 n $/);
      const offset = Number(entry.slice(0, 10));
      expect(raw.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(true);
    });
    expect(raw).toContain(`/Size ${count}`);
    expect(raw).toContain("/Count 2");
  });

  it("draws the text and links it was given", () => {
    const pdf = sample();
    expect(pdfLines(pdf)).toEqual(["Hello (world)", "Second – page"]);
    expect(pdfLinks(pdf)).toEqual(["https://example.com/a"]);
  });

  it("gives identical bytes for identical content", () => {
    expect(sample().equals(sample())).toBe(true);
  });
});
