import { describe, it, expect } from "vitest";
import { buildIcs, foldLine, icsDate, icsDateTime, icsEscape, isoDay } from "../src/ics.js";

describe("calendar file helpers", () => {
  it("escapes commas, semicolons and line breaks", () => {
    expect(icsEscape("Lab 4, part 2; notes")).toBe("Lab 4\\, part 2\\; notes");
    expect(icsEscape("one\ntwo")).toBe("one\\ntwo");
    expect(icsEscape("back\\slash")).toBe("back\\\\slash");
  });

  it("folds a long line to 75 octets and continues it with a space", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    for (const part of folded.split("\r\n")) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(folded.split("\r\n")[1].startsWith(" ")).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"x".repeat(200)}`);
  });

  it("writes dates the way the calendar format wants them", () => {
    expect(icsDateTime(new Date("2026-10-23T23:59:00Z"))).toBe("20261023T235900Z");
    expect(icsDate(new Date("2026-10-23T23:59:00Z"))).toBe("20261023");
    expect(isoDay(new Date("2026-10-23T23:59:00Z"))).toBe("2026-10-23");
  });

  it("writes an all day event as a whole day", () => {
    const ics = buildIcs(
      [{ title: "Reading day", start: "2026-10-30T00:00:00Z", end: "2026-10-31T00:00:00Z", allDay: true }],
      { now: new Date("2026-10-21T00:00:00Z") },
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261030");
    expect(ics).toContain("DTEND;VALUE=DATE:20261031");
  });

  it("keeps the same UID for the same event and gives other events their own", () => {
    const event = { title: "Lab 4", start: "2026-10-23T23:59:00Z", key: "course-1-assignment-12" };
    const first = buildIcs([event], { now: new Date("2026-10-21T00:00:00Z") });
    const second = buildIcs([event], { now: new Date("2026-10-22T00:00:00Z") });
    expect(first.match(/UID:(\S+)/)?.[1]).toBe(second.match(/UID:(\S+)/)?.[1]);

    const two = buildIcs(
      [
        { title: "Lab", start: "2026-10-23T23:59:00Z" },
        { title: "Lab", start: "2026-10-24T23:59:00Z" },
      ],
      { now: new Date("2026-10-21T00:00:00Z") },
    );
    const uids = [...two.matchAll(/UID:(\S+)/g)].map((m) => m[1]);
    expect(uids.length).toBe(2);
    expect(new Set(uids).size).toBe(2);
  });

  it("skips an event without a usable date", () => {
    const ics = buildIcs([{ title: "No date", start: null }], { now: new Date("2026-10-21T00:00:00Z") });
    expect(ics).not.toContain("No date");
    expect(ics).toContain("END:VCALENDAR");
  });
});
