import { inflateSync } from "node:zlib";

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };

function readLiteral(src: string, start: number): { text: string; end: number } {
  let depth = 1;
  let out = "";
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      const next = src[i + 1] ?? "";
      const octal = /^[0-7]{1,3}/.exec(src.slice(i + 1, i + 4));
      if (octal) {
        out += String.fromCharCode(parseInt(octal[0], 8));
        i += 1 + octal[0].length;
      } else {
        out += ESCAPES[next] ?? next;
        i += 2;
      }
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") {
      depth--;
      if (depth === 0) break;
    }
    out += c;
    i++;
  }
  return { text: out, end: i + 1 };
}

function decodeHex(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  const padded = clean.length % 2 ? clean + "0" : clean;
  let out = "";
  if (padded.toUpperCase().startsWith("FEFF")) {
    for (let i = 4; i + 3 < padded.length; i += 4) out += String.fromCharCode(parseInt(padded.slice(i, i + 4), 16));
    return out;
  }
  for (let i = 0; i < padded.length; i += 2) out += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
  return out;
}

/** Pulls the text drawn by Tj and TJ operators out of one decoded content stream. */
function textFromContent(content: string): string {
  let out = "";
  let i = 0;
  while (i < content.length) {
    const c = content[i];
    if (c === "(") {
      const { text, end } = readLiteral(content, i + 1);
      out += text;
      i = end;
    } else if (c === "<" && content[i + 1] !== "<") {
      const close = content.indexOf(">", i);
      if (close < 0) break;
      out += decodeHex(content.slice(i + 1, close));
      i = close + 1;
    } else if (c === "T" && (content[i + 1] === "*" || content[i + 1] === "d" || content[i + 1] === "D")) {
      out += "\n";
      i += 2;
    } else if (c === "E" && content.startsWith("ET", i)) {
      out += "\n";
      i += 2;
    } else if (c === "-" || (c >= "0" && c <= "9")) {
      // A large negative kerning number inside a TJ array is a word gap.
      const m = /^-?\d+(\.\d+)?/.exec(content.slice(i, i + 24));
      if (m && parseFloat(m[0]) < -200 && out && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
      i += m ? m[0].length : 1;
    } else {
      i++;
    }
  }
  return out;
}

/**
 * Best effort text extraction from a PDF held in memory. It reads the text of
 * Flate compressed or plain content streams. Scanned PDFs, encrypted PDFs and
 * fonts with custom encodings can come back empty or garbled.
 */
export function extractPdfText(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Not a PDF file");
  const raw = buf.toString("latin1");
  const pages: string[] = [];
  let pos = 0;
  while (true) {
    const s = raw.indexOf("stream", pos);
    if (s < 0) break;
    if (raw.startsWith("endstream", s - 3)) {
      pos = s + 6;
      continue;
    }
    const dictStart = raw.lastIndexOf("obj", s);
    const dict = dictStart >= 0 ? raw.slice(dictStart, s) : "";
    let dataStart = s + 6;
    if (raw[dataStart] === "\r") dataStart++;
    if (raw[dataStart] === "\n") dataStart++;
    const e = raw.indexOf("endstream", dataStart);
    if (e < 0) break;
    pos = e + 9;
    // Skip images, fonts and other binary streams.
    if (/\/Subtype\s*\/(Image|Type1C|CIDFontType0C|OpenType)|\/Type\s*\/(XObject|ObjStm|XRef)|\/Length1/.test(dict)) continue;
    let data = buf.subarray(dataStart, e);
    if (/\/FlateDecode/.test(dict)) {
      try {
        data = inflateSync(data);
      } catch {
        continue;
      }
    }
    const content = data.toString("latin1");
    if (!/\b(BT|Tj|TJ)\b/.test(content)) continue;
    const text = textFromContent(content)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text) pages.push(text);
  }
  return pages.join("\n\n");
}
