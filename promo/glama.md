# Glama listing pack

Copy and paste text for the Glama MCP directory at https://glama.ai/mcp/servers.

Glama indexes the GitHub repo, and this repo already has a `glama.json` with the maintainer in it, so the listing picks up the README on its own. If a listing form asks for text, use the blocks below. Change nothing else.

## Name

```text
Canvas LMS MCP
```

## Registry name

```text
io.github.AnonymousOnyx22/canvas-lms-student-mcp
```

## Short description

For the search card, about 100 characters.

```text
Read-only Canvas LMS MCP for students. Courses, grades, due dates, missing work and announcements.
```

## About

```markdown
Canvas LMS MCP is a free, open source, read-only MCP server for students who use Canvas LMS by Instructure. It gives AI apps like Claude, ChatGPT and Cursor a set of tools to read a student's Canvas account.

Ask things like "what's due this week", "what am I missing or overdue", "what's my grade in each class" and "what did my instructors announce lately".

## What it can read

- Active courses and their Canvas course IDs
- Canvas to-do list
- Upcoming assignments and events, soonest first
- Past-due work that has not been submitted
- Assignments for one course, with due dates, points and submission status
- Current grade for each course, from the Canvas gradebook
- Modules and module items
- Syllabus text
- Recent announcements
- Discussion topics with unread counts
- Calendar events between two dates

All 11 tools are read only. The server has no tool that submits, edits or deletes anything, so it can never turn in work or change a grade.

## Setup

Run it with `npx -y canvas-lms-student-mcp` on Node 20 or newer. No install step.

It reads two environment variables:

- `CANVAS_BASE_URL`, your school's Canvas address, for example `https://yourschool.instructure.com`
- `CANVAS_API_TOKEN`, a token you create in Canvas under Account > Settings > New Access Token

Run `npx canvas-lms-student-mcp doctor` to check both before you start.

Some schools turn off student access tokens. If the New Access Token button is missing, the school has disabled it and this server cannot connect.

## Privacy

Your token stays on your computer and is only sent to your own school's Canvas address. Nothing is sent to any other server by this project. You can revoke the token any time in Canvas settings.

## Notes

MIT license. Works with any school that runs Canvas LMS. Not affiliated with Instructure. Tests run against a fake Canvas server, so they need no account and no network.
```

## Categories

Pick the education or learning category if the form offers one, then productivity as a second choice.

```text
Education, Learning, Productivity
```

## Tags

```text
canvas, canvas lms, instructure, lms, education, students, grades, due dates, assignments, read only
```

## Install command

```text
npx -y canvas-lms-student-mcp
```

## Links

```text
https://github.com/AnonymousOnyx22/canvas-lms-student-mcp
https://www.npmjs.com/package/canvas-lms-student-mcp
```
