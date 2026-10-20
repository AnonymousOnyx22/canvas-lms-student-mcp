# Awesome list pack

Copy and paste text for getting this server into an awesome MCP servers list.

Lists to target:

- https://github.com/punkpeye/awesome-mcp-servers
- https://github.com/modelcontextprotocol/awesome-mcp-servers

Both lists move their sections around over time. Before you open the PR, open the list, find the education or learning section, and put the entry there. If there is no education section, use the closest one.

## PR title

```text
Add Canvas LMS MCP
```

## PR body

Copy everything inside the block.

```markdown
## What this adds

- [Canvas LMS MCP](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp) - Read-only MCP server for Canvas LMS students. Courses, to-do list, due dates, missing work, grades, announcements, syllabus, modules, discussions and calendar events.

## About the server

Canvas LMS MCP lets AI apps like Claude, ChatGPT and Cursor read a student's Canvas LMS by Instructure courses. It answers things like "what's due this week", "what am I missing" and "what's my grade in each class".

- Free and open source, MIT license.
- Read only by design. There is no tool that submits, edits or deletes anything.
- Runs with `npx -y canvas-lms-student-mcp` on Node 20 or newer. No install step.
- Needs two environment variables: `CANVAS_BASE_URL` and `CANVAS_API_TOKEN`. The token is created by the student in Canvas under Account > Settings > New Access Token. `npx canvas-lms-student-mcp doctor` checks both.
- Works with any school that runs Canvas LMS. Not affiliated with Instructure.
- The token is only ever sent to the school's own Canvas address.
- Tests run against a fake Canvas server, so they need no account and no network.

## Tools

All 11 tools are read only:

`get_my_courses`, `get_todo`, `get_upcoming_due_dates`, `get_missing_assignments`, `get_assignments`, `get_my_grades`, `get_course_content`, `get_syllabus`, `get_announcements`, `get_discussions`, `get_calendar_events`

npm package: https://www.npmjs.com/package/canvas-lms-student-mcp
```

## One line entry

Use this when the list only takes a single line per server.

```text
- [Canvas LMS MCP](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp) - Read-only Canvas LMS for students. Due dates, missing work, grades and announcements.
```

Shorter variant, for lists that keep entries to one clause:

```text
- [Canvas LMS MCP](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp) - Read-only Canvas LMS grades, due dates and missing work for students.
```

## Rules that keep the PR accepted

- Add one entry, in the right section, alphabetically if the list is alphabetical.
- Do not add the server twice or open a second PR while the first one is open.
- Answer review comments. Most reviews ask for a different section or a shorter description, and both are quick.
