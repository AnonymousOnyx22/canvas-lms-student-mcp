import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import { extractPdfText } from "../src/core/pdf.js";

function makePdf(content: string, compress: boolean): Uint8Array {
  const body = compress ? deflateSync(Buffer.from(content, "latin1")) : Buffer.from(content, "latin1");
  const filter = compress ? "/Filter /FlateDecode " : "";
  return Buffer.concat([
    Buffer.from(`%PDF-1.4\n1 0 obj\n<< ${filter}/Length ${body.length} >>\nstream\n`, "latin1"),
    body,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
}

describe("extractPdfText", () => {
  it("reads text from a plain content stream", () => {
    const pdf = makePdf("BT /F1 12 Tf 72 700 Td (Hello Canvas) Tj ET", false);
    expect(extractPdfText(pdf)).toContain("Hello Canvas");
  });

  it("reads text from a compressed stream with TJ arrays and escapes", () => {
    const pdf = makePdf("BT [(Week) -300 (one \\(intro\\))] TJ 0 -14 Td (Line two) Tj ET", true);
    const text = extractPdfText(pdf);
    expect(text).toContain("Week one (intro)");
    expect(text).toContain("Line two");
  });

  it("reads hex strings", () => {
    const pdf = makePdf("BT <48656C6C6F> Tj ET", true);
    expect(extractPdfText(pdf)).toContain("Hello");
  });

  it("returns an empty string when there is no text", () => {
    expect(extractPdfText(makePdf("0 0 m 10 10 l S", true))).toBe("");
  });

  it("rejects data that is not a PDF", () => {
    expect(() => extractPdfText(new TextEncoder().encode("hello"))).toThrow("Not a PDF file");
  });
});
