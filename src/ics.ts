import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const CRLF = "\r\n";

/** Escape a text value the way RFC 5545 asks, so commas and semicolons in names survive. */
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a content line to 75 octets, continuing on the next line with a space. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let cur = "";
  let limit = 75;
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, "utf8") > limit) {
      parts.push(cur);
      cur = ch;
      limit = 74; // a continuation line starts with a space, which counts toward the 75
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.join(CRLF + " ");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A date and time the way RFC 5545 wants it, in UTC: 20261021T235900Z. */
export function icsDateTime(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** A whole day the way RFC 5545 wants it, in UTC: 20261021. */
export function icsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

/** A day as YYYY-MM-DD, the format the Canvas API takes for date filters. */
export function isoDay(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export interface CalendarEvent {
  /** The name of the assignment or event. */
  title: string;
  /** The course the event belongs to. */
  course?: string;
  /** What the event is, so the text around it can say the right word. */
  kind?: "assignment" | "event";
  /** When the event starts, the date and time Canvas gave. */
  start?: string | null;
  /** When the event ends, the date and time Canvas gave. */
  end?: string | null;
  /** True when Canvas says the event lasts all day. */
  allDay?: boolean;
  /** A link back to Canvas. */
  url?: string | null;
  /** Extra lines for the description, for example the points a task is worth. */
  note?: string | null;
  /** The text of the reminder a day before. Defaults to a line about the title. */
  reminder?: string | null;
  /** A stable key, so the same event keeps the same UID every time it is exported. */
  key?: string;
}

export interface IcsOptions {
  /** The calendar name the app shows when the file is opened. */
  name?: string;
  /** The export time, used for DTSTAMP. Defaults to now. */
  now?: Date;
}

/** A UID that stays the same for the same event, so a reimport updates it instead of copying it. */
function makeUid(event: CalendarEvent, start: Date, used: Set<string>): string {
  const base = (event.key ?? event.title).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "event";
  const stamp = icsDateTime(start);
  let uid = `${base}-${stamp}@canvas-lms-student-mcp`;
  let n = 2;
  while (used.has(uid)) uid = `${base}-${n}-${stamp}@canvas-lms-student-mcp`;
  used.add(uid);
  return uid;
}

/** Build the text of an iCalendar file with one event per line of the list. */
export function buildIcs(events: CalendarEvent[], opts: IcsOptions = {}): string {
  const dtstamp = icsDateTime(opts.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AnonymousOnyx22//Canvas LMS Student MCP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(opts.name ?? "Canvas due dates")}`,
  ];
  const used = new Set<string>();
  for (const event of events) {
    const start = event.start ? new Date(event.start) : null;
    if (!start || Number.isNaN(start.getTime())) continue;
    const end = event.end ? new Date(event.end) : null;
    const goodEnd = end && !Number.isNaN(end.getTime()) && end.getTime() > start.getTime() ? end : null;
    const summary = event.course ? `${event.title} (${event.course})` : event.title;
    const description = [event.note, event.url ? `Canvas: ${event.url}` : null].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${makeUid(event, start, used)}`, `DTSTAMP:${dtstamp}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(goodEnd ?? addDays(start, 1))}`);
    } else {
      lines.push(`DTSTART:${icsDateTime(start)}`);
      lines.push(`DTEND:${icsDateTime(goodEnd ?? start)}`);
    }
    lines.push(
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-P1D",
      `DESCRIPTION:${icsEscape(event.reminder ?? `${event.title} is due tomorrow`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Save calendar text as an .ics file in a folder, making the folder if it is not there yet. */
export async function saveIcsFile(folder: string, filename: string, text: string): Promise<string> {
  const dir = resolve(folder);
  await mkdir(dir, { recursive: true });
  const file = join(dir, filename);
  await writeFile(file, text, "utf8");
  return file;
}
