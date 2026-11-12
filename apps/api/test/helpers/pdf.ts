import { inflateSync } from "node:zlib";
import { decodeWinAnsi } from "../../src/pdf/encoding";

/** Reads one PDF literal string starting just after its "(", returning its bytes. */
function readLiteral(source: string, start: number): { bytes: number[]; end: number } {
  const bytes: number[] = [];
  let i = start;
  while (i < source.length && source[i] !== ")") {
    if (source[i] === "\\") {
      const octal = /^[0-7]{3}/.exec(source.slice(i + 1, i + 4));
      if (octal) {
        bytes.push(parseInt(octal[0], 8));
        i += 4;
      } else {
        bytes.push(source.charCodeAt(i + 1));
        i += 2;
      }
    } else {
      bytes.push(source.charCodeAt(i));
      i += 1;
    }
  }
  return { bytes, end: i + 1 };
}

/** The page content streams of a PDF, decompressed. */
export function contentStreams(pdf: Buffer): string[] {
  const streams: string[] = [];
  const raw = pdf.toString("latin1");
  const pattern = /<< \/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/g;
  for (const match of raw.matchAll(pattern)) {
    const start = match.index + match[0].length;
    const data = pdf.subarray(start, start + Number(match[1]));
    streams.push(inflateSync(data).toString("latin1"));
  }
  return streams;
}

/** Every line of text drawn in the document, in drawing order. */
export function pdfLines(pdf: Buffer): string[] {
  const lines: string[] = [];
  for (const stream of contentStreams(pdf)) {
    let index = stream.indexOf("(");
    while (index !== -1) {
      const { bytes, end } = readLiteral(stream, index + 1);
      if (stream.startsWith(" Tj", end)) lines.push(decodeWinAnsi(bytes));
      index = stream.indexOf("(", end);
    }
  }
  return lines;
}

/** The URIs of the document's link annotations. */
export function pdfLinks(pdf: Buffer): string[] {
  const raw = pdf.toString("latin1");
  return [...raw.matchAll(/\/URI \(([^)]*)\)/g)].map((match) => match[1] ?? "");
}
