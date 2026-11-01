export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  /** Query params added to every request (used by APIs that put the token in the URL). */
  defaultQuery?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export type Query = Record<string, string | number | boolean | undefined | Array<string | number>>;

export interface HttpClient {
  /** The address of the Canvas site, so a tool can build a link back to Canvas. */
  readonly baseUrl: string;
  get<T = unknown>(path: string, query?: Query): Promise<T>;
  /** Follows RFC 5988 `Link: rel="next"` pagination and concatenates array pages. */
  getAll<T = unknown>(path: string, query?: Query, maxPages?: number): Promise<T[]>;
  /** Downloads a file from a full URL. Stops with an ApiError once more than maxBytes arrive. */
  getBytes(url: string, maxBytes: number): Promise<Uint8Array>;
}

function buildUrl(base: string, path: string, query: Query = {}, defaults: Record<string, string> = {}): string {
  const url = new URL(path.startsWith("http") ? path : base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, ""));
  for (const [k, v] of Object.entries(defaults)) url.searchParams.set(k, v);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** The host a request went to, so errors can say where the failure happened. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Pull the message out of a Canvas error body such as {"errors":[{"message":"..."}]}. */
export function canvasErrorMessage(body?: string): string | undefined {
  if (!body) return undefined;
  try {
    const data = JSON.parse(body);
    const errors = data?.errors;
    if (Array.isArray(errors) && errors.length) {
      const first = errors[0];
      const msg = typeof first === "string" ? first : first?.message;
      return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
    }
    return typeof data?.message === "string" && data.message.trim() ? data.message.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** How long to tell the user to wait after a 429. */
function retryHint(retryAfter?: string | null): string {
  const raw = retryAfter?.trim();
  let seconds = NaN;
  if (raw) {
    seconds = /^\d+$/.test(raw) ? Number(raw) : Math.round((Date.parse(raw) - Date.now()) / 1000);
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return "Wait a minute and try again.";
  return `Canvas asked to wait ${seconds} second${seconds === 1 ? "" : "s"}. Wait that long, then try again.`;
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (m) return m[1];
  }
  return null;
}

export function createClient(opts: ClientOptions): HttpClient {
  const doFetch = opts.fetchImpl ?? fetch;
  const timeout = opts.timeoutMs ?? 20000;

  function toUrl(path: string, query?: Query): string {
    try {
      return buildUrl(opts.baseUrl, path, query, opts.defaultQuery);
    } catch (err) {
      throw new ApiError(
        `Could not build a request URL from CANVAS_BASE_URL ("${opts.baseUrl}") (${(err as Error).message}). Use a full address such as https://myschool.instructure.com.`,
        0,
      );
    }
  }

  async function request(url: string, accept = "application/json"): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await doFetch(url, {
        headers: { Accept: accept, ...(opts.headers ?? {}) },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ApiError(
          describeStatus(res.status, {
            body: body.slice(0, 500),
            retryAfter: res.headers.get("retry-after"),
            host: hostOf(url),
          }),
          res.status,
          body.slice(0, 500),
        );
      }
      return res;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const message = (err as Error).message;
      const host = hostOf(url);
      if ((err as Error).name === "AbortError") {
        throw new ApiError(
          `Request timed out after ${timeout / 1000}s. ${host} did not answer in time. Check your internet connection and that CANVAS_BASE_URL is your school's Canvas site.`,
          0,
        );
      }
      if (/\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|CERTIFICATE|CERT|UNABLE_TO_VERIFY|ERR_TLS)\b/i.test(message)) {
        throw new ApiError(
          `Could not reach ${host}: ${message}. Check CANVAS_BASE_URL points at your school's Canvas site, for example https://myschool.instructure.com, and that you are online.`,
          0,
        );
      }
      throw new ApiError(`Network error talking to ${host}: ${message}`, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  async function readJson(res: Response, url: string): Promise<unknown> {
    const text = await res.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // fall through: something other than Canvas answered
    }
    const host = hostOf(url);
    const base = `Check CANVAS_BASE_URL points at your school's Canvas site, for example https://myschool.instructure.com.`;
    if (!text.trim()) {
      throw new ApiError(`The server at ${host} returned an empty response instead of Canvas API JSON. ${base}`, 0);
    }
    const type = res.headers.get("content-type") ?? "no content type";
    const snippet = text.trim().replace(/\s+/g, " ").slice(0, 120);
    throw new ApiError(
      `The server at ${host} did not return Canvas API JSON (it answered with ${type}): "${snippet}". ${base}`,
      0,
    );
  }

  return {
    baseUrl: opts.baseUrl.replace(/\/+$/, ""),
    async get<T>(path: string, query?: Query): Promise<T> {
      const url = toUrl(path, query);
      const res = await request(url);
      return (await readJson(res, url)) as T;
    },
    async getAll<T>(path: string, query?: Query, maxPages = 10): Promise<T[]> {
      const out: T[] = [];
      let url: string | null = toUrl(path, query);
      for (let page = 0; url && page < maxPages; page++) {
        const res: Response = await request(url);
        const data = (await readJson(res, url)) as T | T[];
        if (Array.isArray(data)) out.push(...data);
        else out.push(data);
        url = nextLink(res.headers.get("link"));
      }
      return out;
    },
    async getBytes(url: string, maxBytes: number): Promise<Uint8Array> {
      const res = await request(toUrl(url), "*/*");
      const tooBig = () =>
        new ApiError(`The file is larger than the ${maxBytes} byte limit, so it was not downloaded.`, 0);
      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxBytes) throw tooBig();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (res.body) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > maxBytes) {
            await reader.cancel().catch(() => undefined);
            throw tooBig();
          }
          chunks.push(value);
        }
      }
      const out = new Uint8Array(total);
      let at = 0;
      for (const c of chunks) {
        out.set(c, at);
        at += c.length;
      }
      return out;
    },
  };
}

export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface DownloadedFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  /** Extracted text, or undefined when the file type is not one we can read as text. */
  text?: string;
  /** Why there is no text, when text is undefined. */
  note?: string;
}

function isTextType(type: string, name: string): boolean {
  if (/^text\//i.test(type) || /(json|xml|csv|javascript|yaml)/i.test(type)) return true;
  return /\.(txt|md|csv|json|xml|html?|ya?ml|js|ts|py|java|c|cpp|h|sql|log|tex)$/i.test(name);
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/**
 * Fetches one Canvas file by ID. The size is checked from the file record before the download
 * and again while reading. Plain text, CSV, JSON and HTML files come back as text; other
 * types (PDF, Word, images) return metadata and a note instead of text.
 */
export async function downloadFile(
  api: HttpClient,
  fileId: string | number,
  maxBytes = DEFAULT_MAX_FILE_BYTES,
): Promise<DownloadedFile> {
  const id = String(fileId).trim();
  if (!/^\d+$/.test(id)) throw new ApiError(`"${fileId}" is not a Canvas file ID. A file ID is a number.`, 0);
  const meta = await api.get<any>(`/api/v1/files/${id}`);
  const name = String(meta.display_name ?? meta.filename ?? `file ${id}`);
  const contentType = String(meta["content-type"] ?? meta.content_type ?? "application/octet-stream");
  const size = Number(meta.size ?? 0);
  const info: DownloadedFile = { id, name, contentType, size };
  if (size > maxBytes) {
    return { ...info, note: `The file is ${size} bytes, over the ${maxBytes} byte limit, so it was not downloaded.` };
  }
  if (!isTextType(contentType, name)) {
    return { ...info, note: `Text can only be read from plain text, CSV, JSON and HTML files, not ${contentType}.` };
  }
  if (!meta.url) return { ...info, note: "Canvas did not give a download link for this file." };
  const bytes = await api.getBytes(String(meta.url), maxBytes);
  const raw = new TextDecoder("utf-8").decode(bytes);
  const html = /html/i.test(contentType) || /\.html?$/i.test(name);
  return { ...info, size: bytes.length, text: html ? htmlToText(raw) : raw };
}

export interface StatusDetail {
  /** Raw response body, used to surface the message Canvas sent back. */
  body?: string;
  /** Value of the Retry-After response header, if the server sent one. */
  retryAfter?: string | null;
  /** Host the request went to, so the error says where it failed. */
  host?: string;
}

export function describeStatus(status: number, detail: StatusDetail = {}): string {
  const said = canvasErrorMessage(detail.body);
  const canvas = said ? ` Canvas said: "${said}"` : "";
  const where = detail.host ? ` from ${detail.host}` : "";
  switch (status) {
    case 401:
      return `Not signed in (HTTP 401)${where}.${canvas} The access token in CANVAS_API_TOKEN is missing, expired or was revoked. Create a new one in Canvas under Account > Settings > New Access Token, update your config, then run "npx canvas-lms-student-mcp doctor" to check it.`;
    case 403:
      return `Access denied (HTTP 403)${where}.${canvas} Your school may have turned this feature off for students, or this token may belong to a different Canvas account.`;
    case 404:
      return `Not found (HTTP 404)${where}.${canvas} Check the course name or ID, for example from get_my_courses. If every request answers this way, check CANVAS_BASE_URL points at your school's Canvas site, for example https://myschool.instructure.com.`;
    case 429:
      return `Rate limited (HTTP 429)${where}.${canvas} ${retryHint(detail.retryAfter)}`;
    default:
      return status >= 500
        ? `The school's server had a problem (HTTP ${status})${where}.${canvas} Try again shortly.`
        : `Request failed (HTTP ${status})${where}.${canvas}`;
  }
}
