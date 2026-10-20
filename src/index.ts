#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./core/http.js";
import { requireEnv } from "./core/tools.js";
import { normalizeBaseUrl } from "./config.js";
import { createServer, VERSION } from "./server.js";

function usage(): void {
  console.log(`canvas-lms-student-mcp ${VERSION}

Canvas LMS MCP server for students. Read only access to Canvas courses, grades, due dates and announcements.

Environment
  CANVAS_BASE_URL    Your school's Canvas address, for example https://myschool.instructure.com
  CANVAS_API_TOKEN   A token from Canvas, Account > Settings > New Access Token

Commands
  (no command)       Start the MCP server over stdio
  doctor             Check that your URL and token work
  --help, --version`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "--help" || cmd === "-h") return usage();
  if (cmd === "--version" || cmd === "-v") return console.log(VERSION);

  const baseUrl = normalizeBaseUrl(
    requireEnv("CANVAS_BASE_URL", "Set it to your school's Canvas address, for example https://myschool.instructure.com"),
  );
  const token = requireEnv("CANVAS_API_TOKEN", "Create one in Canvas under Account, Settings, New Access Token.");
  const api = createClient({ baseUrl, headers: { Authorization: `Bearer ${token}` } });

  if (cmd === "doctor") {
    try {
      const me = await api.get<{ name?: string }>("/api/v1/users/self");
      console.log(`Connected to ${baseUrl} as ${me.name ?? "your account"}.`);
    } catch (e) {
      console.error(`Could not connect. ${(e as Error).message}`);
      process.exit(1);
    }
    return;
  }

  const server = createServer(api);
  await server.connect(new StdioServerTransport());
  console.error(`canvas-lms-student-mcp ${VERSION} running for ${baseUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
