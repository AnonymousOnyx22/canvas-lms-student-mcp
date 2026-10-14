import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HttpClient } from "./core/http.js";
import { registerTools } from "./core/tools.js";
import { tools } from "./tools.js";

export const VERSION = "0.1.1";

export function createServer(api: HttpClient): McpServer {
  const server = new McpServer({ name: "canvas-lms-student-mcp", version: VERSION });
  registerTools(server, tools, api);
  return server;
}
