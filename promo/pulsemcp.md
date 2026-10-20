# PulseMCP listing pack

Copy and paste text for a server listing on https://www.pulsemcp.com.

Use the blocks below in the listing form. Change nothing else.

## Name

```text
Canvas LMS MCP
```

## Summary

For the search card. Keep it under the form's limit.

```text
Read-only Canvas LMS MCP for students. Courses, grades, due dates, missing work and announcements for Claude, ChatGPT and Cursor.
```

## Description

```markdown
Canvas LMS MCP is a free, open source, read-only MCP server for students who use Canvas LMS by Instructure. It gives AI apps like Claude, ChatGPT, Cursor and Copilot a set of tools to read a student's Canvas account.

## What it can do

- List active courses with their Canvas course IDs
- Show the Canvas to-do list
- Show upcoming assignments and events, soonest first
- Show past-due work that has not been submitted
- Show assignments for one course with due dates, points and submission status: not submitted, submitted, graded, missing or excused
- Show the current grade for each course, straight from the Canvas gradebook
- Read modules and module items
- Read syllabus text with HTML removed
- Read recent announcements, for one course or all courses
- Read discussion topics with unread counts
- Read calendar events between two dates

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

## License

```text
MIT
```

## Links

Repository:

```text
https://github.com/AnonymousOnyx22/canvas-lms-student-mcp
```

Website:

```text
https://brightspacemcp.com
```

## Follow up

After the listing is live, open it once and check that the tools list shows all 11 tools and that the install command survived the paste. Fix the listing in place if a field got truncated.
