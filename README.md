# Canvas MCP for students

Ask your AI what's actually left to do in Canvas.

This is a free, open source [MCP](https://modelcontextprotocol.io) server. It lets Claude, ChatGPT, Cursor and other AI apps read your Canvas courses, due dates, grades and announcements. It is **read only**. It can never submit, edit or delete anything.

Works with any school that uses Canvas. Not affiliated with Instructure.

Free forever. No sign up and no subscription. Your login details only ever go to your own school.

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

All tools are read only.

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

## Also available

- [Brightspace MCP](https://brightspacemcp.com) for D2L Brightspace, with a hosted version, deadline alerts and a daily digest.

## License

MIT
