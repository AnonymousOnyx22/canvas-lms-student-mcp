# Canvas LMS MCP for students

Ask your AI what's actually left to do in Canvas.

Canvas LMS MCP is a free, open source [MCP](https://modelcontextprotocol.io) server for Claude, ChatGPT, Cursor and other AI apps. It reads your Canvas courses, due dates, grades and announcements. It is **read only**. It can never submit, edit or delete anything.

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
- "What's my grade in each class?"
- "What did my instructors announce lately?"
- "Show me what's in the Week 3 module for Networking."

## Tools

All tools are read only. Every tool description includes an example prompt your AI can copy.

| Tool | What it does |
| --- | --- |
| `get_my_courses` | Your active courses and their IDs |
| `get_todo` | Your Canvas to-do list |
| `get_upcoming_due_dates` | Upcoming assignments and events, soonest first |
| `get_missing_assignments` | Past due work you haven't submitted |
| `get_assignments` | Assignments for a course with due dates and submission status |
| `get_my_grades` | Current grade for each course |
| `get_course_content` | Modules and items for a course |
| `get_syllabus` | A course's syllabus text |
| `get_announcements` | Recent announcements |
| `get_discussions` | Discussion topics for a course |
| `get_calendar_events` | Calendar events between two dates |

## Privacy and security

- Your token stays on your computer. It is only sent to your own school's Canvas address.
- Nothing is sent to any other server by this project.
- Every tool is marked read only. Revoke the token any time in Canvas settings.

## Troubleshooting

| Message | Fix |
| --- | --- |
| Not signed in | Your token expired or was revoked. Make a new one. |
| Access denied | Your school turned that feature off for students. |
| Not found | Check the course ID with `get_my_courses`. |
| Rate limited | Wait a minute and try again. |

## Development

```bash
npm install
npm run build
npm test
```

Tests run against a fake Canvas server, so they need no account or network.

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
