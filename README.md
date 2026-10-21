# Canvas LMS MCP for students

[![tests](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/AnonymousOnyx22/canvas-lms-student-mcp/actions/workflows/ci.yml)

Ask your AI what's actually left to do in Canvas.

Canvas LMS MCP is a free, open source [MCP](https://modelcontextprotocol.io) server for Claude, ChatGPT, Cursor and other AI apps. It reads your Canvas courses, due dates, grades and announcements, and it is **read only** in Canvas: it never submits, edits or deletes anything there. The one thing it writes is an .ics calendar file on your own computer, and only when you ask it to.

Install and run it with npx, no install step needed:

```bash
npx -y canvas-lms-student-mcp
```

It reads two environment variables: `CANVAS_BASE_URL`, your school's Canvas address, and `CANVAS_API_TOKEN`, a token you create in Canvas.

Works with any school that uses Canvas. Not affiliated with Instructure. Free forever, no sign up and no subscription. Your login details only ever go to your own school.

## Quick start

1. In Canvas, go to **Account > Settings**, scroll to **Approved Integrations** and click **New Access Token**. Copy it.
2. Add this to your AI app's MCP config (for Claude Desktop that's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "canvas": {
      "command": "npx",
      "args": ["-y", "canvas-lms-student-mcp"],
      "env": {
        "CANVAS_BASE_URL": "https://yourschool.instructure.com",
        "CANVAS_API_TOKEN": "paste-your-token-here"
      }
    }
  }
}
```

3. Restart your AI app and ask something like "what's due this week?"

To check your setup first, run `npx canvas-lms-student-mcp doctor` with the two environment variables set.

> Some schools turn off student access tokens. If you don't see the New Access Token button, your school has disabled it and this server can't connect to your account.

## What you can ask

- "What's due this week?"
- "Do I have anything missing or overdue?"
- "What's my grade in each class, and which assignments make it up?"
- "What did my instructors announce lately?"
- "What's new in Canvas since last week?"
- "Show me what's in the Week 3 module for Networking."
- "Which assignments are still due in my Networking 1 course?"
- "Put my Canvas due dates in Google Calendar."

## Tools

All 13 tools read from Canvas LMS and none of them can submit, edit or delete anything there. Every tool description includes an example prompt your AI can copy, and the Ask like column repeats those prompts here. The last one, `export_due_dates_calendar`, writes an .ics file to a folder you name.

Where a tool works on one course, you can name the course instead of looking up its number. Give the Canvas course ID or the course name, for example "Networking 1", and the name is matched against the list `get_my_courses` shows. A name that fits no course says so and points back at `get_my_courses`.

| Tool | What it does | Ask like |
| --- | --- | --- |
| `get_my_courses` | Your active courses and their IDs | "What are my Canvas courses this term?" |
| `get_todo` | Your Canvas to-do list | "What does Canvas say I still need to do?" |
| `get_upcoming_due_dates` | Upcoming assignments and events, soonest first | "What is due in Canvas this week?" |
| `get_missing_assignments` | Past due work you haven't submitted | "What am I missing in Canvas?" |
| `get_assignments` | Assignments for a course by ID or name, with due dates and submission status | "Which Canvas assignments in Networking 1 are overdue?" |
| `get_my_grades` | Current grade for each course, plus the assignment scores and submission status behind it | "What is my grade in each Canvas course and which assignments make it up?" |
| `get_course_content` | Modules and items for a course by ID or name | "Show me the Week 3 module in my Canvas Networking course." |
| `get_syllabus` | A course's syllabus text, by ID or name | "What does the Canvas syllabus say about grading in Scripting?" |
| `get_announcements` | Recent announcements, for the courses you name or for all of them | "What did my instructors announce in Canvas lately?" |
| `get_whats_new` | One catch up: recent announcements, newly graded work and unread discussion replies | "What's new in Canvas since last week?" |
| `get_discussions` | Discussion topics for a course by ID or name | "What discussions are open in my Canvas Networking course?" |
| `get_calendar_events` | Calendar events between two dates | "What is on my Canvas calendar between 2026-10-01 and 2026-10-31?" |
| `export_due_dates_calendar` | An .ics file with your due dates, ready to import into Google Calendar or Apple Calendar | "Put my Canvas due dates in Google Calendar." |

## Calendar export

`export_due_dates_calendar` turns your Canvas due dates and your Canvas calendar events into an iCalendar file. Name a folder and the file is saved there, for example "Save my Canvas due dates to my Documents folder as an .ics file". Open the file or import it in Google Calendar, Apple Calendar or Outlook.

The file holds the next 30 days and only the work you still owe. Use `days_ahead` for a longer window, `course_id` for one course by ID or name, and `include_submitted` to add the work you already handed in. Each event carries the course name, the points, the submission status, a link back to Canvas and a reminder the day before. Leave the folder out and the calendar text comes back instead, so you can save it under any name you like.

## Privacy and security

- Your token stays on your computer. It is only sent to your own school's Canvas address.
- Nothing is sent to any other server by this project.
- Twelve tools are marked read only. The calendar export writes one .ics file in a folder you name, and nothing else.
- Revoke the token any time in Canvas settings.

## Troubleshooting

Errors from Canvas and from the connection say what went wrong and what to fix. The most common ones:

| Message | Fix |
| --- | --- |
| Not signed in | Your token is missing, expired or was revoked. Make a new one in Canvas (Account > Settings > New Access Token), then run `npx canvas-lms-student-mcp doctor`. |
| Access denied | Your school turned that feature off for students, or the token belongs to a different Canvas account. |
| Not found | Check the course name or ID with `get_my_courses`. If every request says not found, `CANVAS_BASE_URL` is wrong. |
| Rate limited | Wait the number of seconds the message says, then try again. |
| Could not reach | The host in `CANVAS_BASE_URL` does not exist. Check the spelling, for example `https://myschool.instructure.com`. |
| did not return Canvas API JSON | The address in `CANVAS_BASE_URL` is not a Canvas site. Use your school's Canvas address with no extra path. |

## Development

```bash
npm install
npm run build
npm test
```

Tests run against a fake Canvas server, so they need no account or network. The doctor command, the error messages for a bad token, access denied, a rate limit and a reply that is not Canvas, the .ics calendar export and the lookup of a course by name are part of that suite. A metadata test keeps package.json, server.json, glama.json, llms.txt and the server code on one version number, checks that the tool list in the docs still matches the tools the server registers, and checks that the registry entry lists the same environment variables the code reads. Pushing to main and opening a pull request run the same build and test, so the badge at the top of this page shows the current result.

The npm package ships two registry files: `server.json` for the Model Context Protocol registry and `glama.json` for the Glama directory. Both carry the name, the description, the version, the license, the keywords, the repository and the homepage, so a listing shows what the server does and where the code lives. The `server.json` entry also names npx as the runtime and lists the two environment variables a listing site should ask for, with `CANVAS_API_TOKEN` marked as a secret value. It carries the GitHub repository id as well, and that id stays the same when a repository is renamed.

## Why Canvas MCP

If your school runs Canvas, use this server. If it runs Brightspace, use brightspace-mcp-server. The two cover the same ground for their own LMS.

| | Canvas MCP | brightspace-mcp-server |
| --- | --- | --- |
| LMS | Canvas (Instructure) | Brightspace (D2L) |
| Free | Yes | Yes |
| Changes nothing in the LMS | Yes | Yes |
| npx one liner | Yes | Yes |

Canvas MCP signs in with an API token you create in Canvas. brightspace-mcp-server signs in with your school login through a one time setup command.

## More free student MCP servers

All free, open source and read only where they touch your accounts. Browse the full list at [brightspacemcp.com/more-mcps](https://brightspacemcp.com/more-mcps/).

| Server | What it does |
| --- | --- |
| [Brightspace MCP](https://github.com/AnonymousOnyx22/brightspace-d2l-mcp) | D2L Brightspace for AI. Due dates with real submission status, grades, a target grade calculator and course files. |
| [Moodle MCP](https://github.com/AnonymousOnyx22/moodle-student-mcp) | Read-only Moodle for AI. Due dates, overdue work, grades and announcements. |
| [Google Classroom MCP](https://github.com/AnonymousOnyx22/google-classroom-student-mcp) | Read-only Google Classroom for AI. To-do, due dates, missing work and grades. |
| [GPA Calculator MCP](https://github.com/AnonymousOnyx22/gpa-calculator-mcp) | GPA, grade conversion and what-do-I-need-on-the-final math for AI. Works offline, no account. |
| [Citations MCP](https://github.com/AnonymousOnyx22/student-citations-mcp) | APA, MLA and Chicago citations from a DOI, an ISBN or typed details. No account. |
| [Study Planner MCP](https://github.com/AnonymousOnyx22/study-planner-mcp) | Exam study schedules, spaced repetition dates, pomodoro plans and assignment milestones. Works offline. |
| [Paper Finder MCP](https://github.com/AnonymousOnyx22/paper-finder-student-mcp) | Search scholarly papers, find open access copies and related work through OpenAlex. No key needed. |

## License

MIT
