import { describe, it, expect } from "vitest";
import { createClient, describeStatus, canvasErrorMessage } from "../src/core/http.js";

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  const calls: string[] = [];
  const fn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push(url);
    const result = handler(url, init);
    const signal = init?.signal;
    if (!signal || signal.aborted) return result;
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      };
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve(result).then(resolve, reject).finally(() =>
        signal.removeEventListener("abort", onAbort)
      );
    });
  };
  (fn as unknown as { calls: string[] }).calls = calls;
  return fn as unknown as typeof fetch;
}

describe("createClient get", () => {
  it("returns parsed JSON and sends query params", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch((url) => {
        expect(url).toContain("/api/v1/courses/1?include=term");
        return response({ id: 1, name: "Math" });
      }),
    });
    const data = await client.get("/api/v1/courses/1", { include: "term" });
    expect(data).toEqual({ id: 1, name: "Math" });
  });

  it("adds default query params to every request", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      defaultQuery: { access_token: "tok" },
      fetchImpl: fakeFetch((url) => {
        expect(url).toContain("access_token=tok");
        return response({ ok: true });
      }),
    });
    await client.get("/api/v1/courses", { per_page: "5" });
  });

  it("rejects a bad base URL with a helpful message", async () => {
    const client = createClient({
      baseUrl: "not-a-url",
      fetchImpl: fakeFetch(() => response({})),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Could not build a request URL");
      expect(err.message).toContain("CANVAS_BASE_URL");
    }
  });

  it("turns a 401 into an ApiError with the Canvas message", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() =>
        response({ errors: [{ message: "Invalid access token." }] }, 401),
      ),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Not signed in (HTTP 401)");
      expect(err.message).toContain("Invalid access token.");
    }
  });

  it("turns a 403 into an access denied error", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() =>
        response({ errors: [{ message: "user not authorized" }] }, 403),
      ),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Access denied (HTTP 403)");
      expect(err.message).toContain("user not authorized");
    }
  });

  it("turns a 404 into a not found error", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({ errors: [{ message: "not found" }] }, 404)),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses/999");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Not found (HTTP 404)");
      expect(err.message).toContain("not found");
    }
  });

  it("explains how long to wait on a 429 with a seconds retry header", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() =>
        response(
          { errors: [{ message: "Rate limit exceeded" }] },
          429,
          { "retry-after": "30" },
        ),
      ),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Rate limited (HTTP 429)");
      expect(err.message).toContain("30 seconds");
      expect(err.message).toContain("Rate limit exceeded");
    }
  });

  it("explains how long to wait on a 429 with a date retry header", async () => {
    const later = new Date(Date.now() + 120_000).toUTCString();
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() =>
        response({ errors: [{ message: "slow down" }] }, 429, { "retry-after": later }),
      ),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toMatch(/Canvas asked to wait \d+ seconds\./);
    }
  });

  it("tells the user to wait a minute on a 429 without a retry header", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({ errors: [{ message: "limited" }] }, 429)),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Rate limited (HTTP 429)");
      expect(err.message).toContain("Wait a minute and try again.");
    }
  });

  it("describes 500 as a server problem", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({ errors: [{ message: "boom" }] }, 500)),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("The school's server had a problem (HTTP 500)");
    }
  });

  it("describes other statuses generically", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({}, 418)),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Request failed (HTTP 418)");
    }
  });

  it("reports DNS failures with the host", async () => {
    const client = createClient({
      baseUrl: "https://nosuchschool.instructure.com",
      fetchImpl: fakeFetch(() => {
        throw new Error("fetch failed: ENOTFOUND nosuchschool.instructure.com");
      }),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Could not reach nosuchschool.instructure.com");
    }
  });

  it("reports timeouts with how long it waited", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      timeoutMs: 50,
      fetchImpl: fakeFetch(() => new Promise(() => {}) as unknown as Response),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("timed out");
    }
  });

  it("reports a non-JSON answer instead of Canvas JSON", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() =>
        new Response("<html><body>not canvas</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("did not return Canvas API JSON");
    }
  });

  it("reports an empty response instead of Canvas JSON", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => new Response("", { status: 200 })),
    });
    let err: unknown;
    try {
      await client.get("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("returned an empty response instead of Canvas API JSON");
    }
  });
});

describe("createClient getAll pagination", () => {
  it("follows rel=next links and concatenates every page", async () => {
    const pages: [unknown, string | null][] = [
      [[1, 2], '<https://school.instructure.com/api/v1/courses?page=2>; rel="next"'],
      [[3, 4], null],
    ];
    let page = 0;
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => {
        const [data, link] = pages[page++];
        return response(data, 200, link ? { link } : {});
      }),
    });
    const all = await client.getAll("/api/v1/courses");
    expect(all).toEqual([1, 2, 3, 4]);
    expect(page).toBe(2);
  });

  it("stops after maxPages even when more pages exist", async () => {
    const pages: [unknown, string | null][] = [
      [[1, 2], '<https://school.instructure.com/api/v1/courses?page=2>; rel="next"'],
      [[3, 4], '<https://school.instructure.com/api/v1/courses?page=3>; rel="next"'],
      [[5, 6], null],
    ];
    let page = 0;
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => {
        const [data, link] = pages[page++];
        return response(data, 200, link ? { link } : {});
      }),
    });
    const all = await client.getAll("/api/v1/courses", undefined, 2);
    expect(all).toEqual([1, 2, 3, 4]);
    expect(page).toBe(2);
  });

  it("returns one page when there is no link header", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response([1, 2, 3])),
    });
    expect(await client.getAll("/api/v1/courses")).toEqual([1, 2, 3]);
  });

  it("pushes a single object page as one element", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({ id: 7 })),
    });
    expect(await client.getAll("/api/v1/courses/7")).toEqual([{ id: 7 }]);
  });

  it("propagates a 401 on the first page", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch(() => response({ errors: [{ message: "bad" }] }, 401)),
    });
    let err: unknown;
    try {
      await client.getAll("/api/v1/courses");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    if (err instanceof Error) {
      expect(err.message).toContain("Not signed in (HTTP 401)");
    }
  });

  it("uses the next link URL exactly as sent by the server", async () => {
    const client = createClient({
      baseUrl: "https://school.instructure.com",
      fetchImpl: fakeFetch((url) => {
        if (url.includes("page=1")) {
          return response(
            [1],
            200,
            { link: '<https://other.host.instructure.com/api/v1/courses?page=2>; rel="next"' },
          );
        }
        return response([2]);
      }),
    });
    expect(await client.getAll("/api/v1/courses?page=1")).toEqual([1, 2]);
  });
});

describe("canvasErrorMessage", () => {
  it("pulls the message out of a Canvas errors array", () => {
    expect(canvasErrorMessage('{"errors":[{"message":"bad token"}]}')).toBe("bad token");
    expect(canvasErrorMessage('{"errors":[{"message":""}]}')).toBeUndefined();
    expect(canvasErrorMessage('{"errors":["plain string"]}')).toBe("plain string");
    expect(canvasErrorMessage('{"errors":[]}')).toBeUndefined();
  });

  it("falls back to a top level message", () => {
    expect(canvasErrorMessage('{"message":"something went wrong"}')).toBe("something went wrong");
    expect(canvasErrorMessage('{"message":"   "}')).toBeUndefined();
  });

  it("returns undefined for invalid or empty bodies", () => {
    expect(canvasErrorMessage(undefined)).toBeUndefined();
    expect(canvasErrorMessage("")).toBeUndefined();
    expect(canvasErrorMessage("not json at all")).toBeUndefined();
    expect(canvasErrorMessage('{"errors":[{"code":123}]}')).toBeUndefined();
  });
});

describe("describeStatus", () => {
  it("formats each Canvas status", () => {
    expect(describeStatus(401)).toContain("Not signed in (HTTP 401)");
    expect(describeStatus(403)).toContain("Access denied (HTTP 403)");
    expect(describeStatus(404)).toContain("Not found (HTTP 404)");
    expect(describeStatus(429)).toContain("Rate limited (HTTP 429)");
    expect(describeStatus(500)).toContain("The school's server had a problem (HTTP 500)");
    expect(describeStatus(418)).toContain("Request failed (HTTP 418)");
  });

  it("includes the Canvas message and host when provided", () => {
    const msg = describeStatus(404, {
      body: '{"errors":[{"message":"course not found"}]}',
      host: "school.instructure.com",
    });
    expect(msg).toContain("course not found");
    expect(msg).toContain("from school.instructure.com");
  });

  it("tells the user to wait a minute on 429 without retry-after", () => {
    expect(describeStatus(429)).toContain("Wait a minute and try again.");
    expect(describeStatus(429, { retryAfter: "0" })).toContain("Wait a minute and try again.");
  });

  it("reports seconds from a numeric retry-after header", () => {
    expect(describeStatus(429, { retryAfter: "30" })).toContain("30 seconds");
    expect(describeStatus(429, { retryAfter: "1" })).toContain("1 second");
  });

  it("reports seconds from a date retry-after header", () => {
    const later = new Date(Date.now() + 60_000).toUTCString();
    expect(describeStatus(429, { retryAfter: later })).toMatch(/Canvas asked to wait \d+ seconds\./);
  });
});
