/*
 * WinAnsiEncoding, the 8-bit encoding of the standard PDF fonts. It matches Latin-1 except for
 * 0x80 to 0x9F, which hold typographic marks such as curly quotes, dashes and the bullet.
 */

const MARKS: Record<number, number> = {
  0x20ac: 0x80, // €
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85, // …
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98,
  0x2122: 0x99, // ™
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const FROM_CODE = new Map(Object.entries(MARKS).map(([unicode, code]) => [code, Number(unicode)]));

const QUESTION_MARK = 0x3f;

/** Encodes text for a standard font; characters the encoding lacks become "?". */
export function encodeWinAnsi(text: string): number[] {
  const codes: number[] = [];
  for (const char of text) {
    const unicode = char.codePointAt(0) ?? QUESTION_MARK;
    if ((unicode >= 0x20 && unicode < 0x7f) || (unicode >= 0xa0 && unicode <= 0xff)) {
      codes.push(unicode);
    } else if (unicode === 0x2011) {
      codes.push(0x2d); // non-breaking hyphen
    } else {
      codes.push(MARKS[unicode] ?? QUESTION_MARK);
    }
  }
  return codes;
}

/** The reverse of encodeWinAnsi, for reading text back out of a document. */
export function decodeWinAnsi(codes: Iterable<number>): string {
  let text = "";
  for (const code of codes) text += String.fromCodePoint(FROM_CODE.get(code) ?? code);
  return text;
}

/**
 * A PDF literal string holding the given bytes. Brackets and backslashes are escaped and
 * anything outside printable ASCII is written as an octal escape, so the content stays ASCII.
 */
export function literalString(codes: number[]): string {
  let out = "(";
  for (const code of codes) {
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else if (code >= 0x20 && code < 0x7f) out += String.fromCharCode(code);
    else out += `\\${code.toString(8).padStart(3, "0")}`;
  }
  return `${out})`;
}

/** A PDF text string (used in metadata) as UTF-16BE hex with a byte-order mark. */
export function textString(text: string): string {
  let hex = "<FEFF";
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `${hex}>`;
}
