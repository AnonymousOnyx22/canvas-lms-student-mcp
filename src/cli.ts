import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./core/http.js";
import { normalizeBaseUrl } from "./config.js";
import { createServer, VERSION } from "./server.js";

export interface CliIo {
  /** Normal output, such as the doctor result and the help text. */
  out: (line: string) => void;
  /** Error output, such as what went wrong and the startup banner. */
  err: (line: string) => void;
}

export interface CliOptions {
  /** Environment variables the command reads. Defaults to process.env. */
  env?: Record<string, string | undefined>;
  /** Where the command writes. Defaults to the console. */
  io?: Partial<CliIo>;
}

function usage(): string {
  return `canvas-lms-student-mcp ${VERSION}

Canvas LMS MCP server for students. Read only access to Canvas courses, grades, due dates and announcements, plus an .ics calendar export.

Environment
  CANVAS_BASE_URL    Your school's Canvas address, for example https://myschool.instructure.com
  CANVAS_API_TOKEN   A token from Canvas, Account > Settings > New Access Token

Commands
  (no command)       Start the MCP server over stdio
  doctor             Check that your URL and token work
  --help, --version`;
}

/**
 * Run the command line tool.
 * Returns the exit code so tests can check it without ending the test run.
 */
export async function runCli(argv: string[], opts: CliOptions = {}): Promise<number> {
  const out = opts.io?.out ?? ((line: string) => console.log(line));
  const err = opts.io?.err ?? ((line: string) => console.error(line));
  const env = opts.env ?? process.env;

  const cmd = argv[0];
  if (cmd === "--help" || cmd === "-h") {
    out(usage());
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    out(VERSION);
    return 0;
  }

  const rawBase = env.CANVAS_BASE_URL;
  if (!rawBase) {
    err("Missing CANVAS_BASE_URL. Set it to your school's Canvas address, for example https://myschool.instructure.com");
    return 1;
  }
  const token = env.CANVAS_API_TOKEN;
  if (!token) {
    err("Missing CANVAS_API_TOKEN. Create one in Canvas under Account, Settings, New Access Token.");
    return 1;
  }

  const baseUrl = normalizeBaseUrl(rawBase);
  const api = createClient({ baseUrl, headers: { Authorization: `Bearer ${token}` } });

  if (cmd === "doctor") {
    try {
      const me = await api.get<{ name?: string }>("/api/v1/users/self");
      out(`Connected to ${baseUrl} as ${me.name ?? "your account"}.`);
      return 0;
    } catch (e) {
      err(`Could not connect. ${(e as Error).message}`);
      return 1;
    }
  }

  const server = createServer(api);
  await server.connect(new StdioServerTransport());
  err(`canvas-lms-student-mcp ${VERSION} running for ${baseUrl}`);
  return 0;
}
