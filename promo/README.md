# Promo pack

Ready to paste copy for listing this MCP server on other sites. Nothing here posts or publishes anything for you. Open the file you need, copy the block, paste it.

| File | Use it for |
| --- | --- |
| [awesome-list.md](awesome-list.md) | Pull request to an awesome MCP servers list, plus short one-line entries |
| [glama.md](glama.md) | Glama MCP directory listing |
| [pulsemcp.md](pulsemcp.md) | PulseMCP server listing |

Weekly rhythm: pick one channel from the table, copy its block, paste it, change nothing else. The copy only needs edits if a fact below stops being true.

## Facts this pack is built on

Every claim in these files comes from the code and the README. If you change any of them, fix the copy too.

- npm package `canvas-lms-student-mcp`, run with `npx -y canvas-lms-student-mcp`. No install step.
- Needs two environment variables: `CANVAS_BASE_URL` and `CANVAS_API_TOKEN`. `npx canvas-lms-student-mcp doctor` checks both.
- 11 tools, all read only: `get_my_courses`, `get_todo`, `get_upcoming_due_dates`, `get_missing_assignments`, `get_assignments`, `get_my_grades`, `get_course_content`, `get_syllabus`, `get_announcements`, `get_discussions`, `get_calendar_events`.
- Cannot submit, edit or delete anything. There is no write tool in the server.
- Works with any school that runs Canvas LMS by Instructure. Not affiliated with Instructure.
- MIT license. Needs Node 20 or newer.
- Tests run against a fake Canvas server, so they need no account and no network.
- Your token only ever goes to your own school's Canvas address. Nothing is sent to any other server.
- Registry name: `io.github.AnonymousOnyx22/canvas-lms-student-mcp`.

## Links

- Source: https://github.com/AnonymousOnyx22/canvas-lms-student-mcp
- npm: https://www.npmjs.com/package/canvas-lms-student-mcp
- More free student MCP servers: https://brightspacemcp.com/more-mcps/

## One line copy

Shortest, for a field with a tight limit:

```text
Ask your AI what's actually left to do in Canvas.
```

About 100 characters:

```text
Canvas LMS MCP server for students. Read only Canvas courses, grades, due dates and announcements.
```

Social length, about 280 characters:

```text
Free open source MCP server for Canvas LMS students. Your AI app can list courses, due dates, missing work, grades, announcements, syllabus, modules, discussions and calendar events. Read only, it can never submit or edit anything. npx -y canvas-lms-student-mcp
```
