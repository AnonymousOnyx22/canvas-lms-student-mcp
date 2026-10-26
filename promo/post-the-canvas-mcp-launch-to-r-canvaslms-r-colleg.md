Where it goes: r/CanvasLMS and r/college (same text, check each sub's self promotion rule first), and a shorter version in the MCP Discord (see the bottom).

**Title:** I built a free tool that lets your AI app read your Canvas due dates and grades

**Body:**

I got tired of opening five courses every morning to work out what was actually due, so I built a small open source MCP server for Canvas. You connect it to an AI app that supports MCP (Claude Desktop, Claude Code, Cursor, VS Code or Windsurf) and then just ask things like:

- "What's due this week?"
- "Do I have anything missing or overdue?"
- "What's my grade in each class, and which assignments make it up?"
- "What do I need on the rest of my work in Networking 1 to get an 85 percent?"

It is read only in Canvas. It can't submit, edit or delete anything. The only thing it writes is an .ics calendar file on your own computer, and only if you ask for it, so you can import your due dates into Google Calendar.

Setup is a Canvas access token (Account > Settings > New Access Token) and one line in your AI app's MCP config:

    npx -y canvas-lms-student-mcp

You also set `CANVAS_BASE_URL` (your school's Canvas address) and `CANVAS_API_TOKEN`. Your token only goes to your own school's Canvas. `npx canvas-lms-student-mcp doctor` checks your setup.

One catch: some schools turn off student access tokens. If you don't see the New Access Token button, this won't work for you.

It's free, MIT licensed, and not affiliated with Instructure. If something breaks at your school, tell me what the error says and I'll look at it.

https://github.com/AnonymousOnyx22/canvas-lms-student-mcp

**Shorter version for the MCP Discord:**

Made a read only MCP server for Canvas LMS, aimed at students: courses, due dates, missing work, grades, announcements, syllabus, modules, discussions and an .ics export. Run it with `npx -y canvas-lms-student-mcp` (needs `CANVAS_BASE_URL` and `CANVAS_API_TOKEN`). Source and tool list: https://github.com/AnonymousOnyx22/canvas-lms-student-mcp . Feedback welcome, especially on tool descriptions.
