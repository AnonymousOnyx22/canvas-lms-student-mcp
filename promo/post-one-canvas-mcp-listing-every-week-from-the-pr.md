Goes to: r/CanvasLMS as a post, then the description field on mcp.so, Smithery, Glama and PulseMCP as a listing.

## Reddit post

Title:

```text
I built a free MCP server so you can ask what's actually left in Canvas
```

Body:

````markdown
I'm a student and I kept losing track of what was actually left in Canvas, so I built a small MCP server for it. It's free, open source and MIT licensed.

It reads your Canvas account and answers things like:

- What's due this week?
- What am I missing or overdue?
- What's my grade in each class, and which assignments make it up?
- What did my instructors announce lately?
- What's new since last week, including newly graded work and unread discussion replies?
- What's in the Week 3 module for one course?
- Can you put my due dates in Google Calendar?

There are 13 tools in all: courses, to do list, upcoming due dates, missing work, assignments for one course, grades, modules, syllabus, announcements, a catch up call, discussions, calendar events and an .ics export. You can name a course instead of looking up its number.

It is read only in Canvas. No tool can submit, edit or delete anything there, so it can't turn in work or change a grade. The only thing it writes is the .ics calendar file you ask for, saved in the folder you name.

Setup:

1. In Canvas, go to Account > Settings > Approved Integrations > New Access Token and copy the token.
2. Add this to your MCP client config, for example `claude_desktop_config.json` for Claude Desktop or the MCP settings in Cursor:

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

3. Restart the app and ask what's due this week.

The install line on its own is `npx -y canvas-lms-student-mcp`. It needs Node 20 or newer and the two environment variables above. To check the setup first, run `npx canvas-lms-student-mcp doctor`.

Two things to know before you try it. Your token stays on your computer and is only sent to your school's Canvas address, nothing goes to any other server. And some schools turn off student access tokens. If you don't see the New Access Token button, your school has disabled it and this server can't connect to your account.

Source: https://github.com/AnonymousOnyx22/canvas-lms-student-mcp
npm: https://www.npmjs.com/package/canvas-lms-student-mcp

Not affiliated with Instructure. Happy to hear what's missing or broken.
````

## Listing blurb

For the description field when you submit to mcp.so, Smithery, Glama or PulseMCP. Paste the matching longer copy from `glama.md`, `pulsemcp.md` or `awesome-list.md` if the form has room for more.

```text
Canvas LMS MCP is a free, open source server for students. Ask what's due this week, what's missing, your grade in each class and what your instructors announced. It reads courses, to do list, due dates, assignments, grades, modules, syllabus, announcements, discussions and calendar events, and saves due dates as an .ics file. Read only in Canvas: it never submits, edits or deletes anything. npx -y canvas-lms-student-mcp
```

## Weekly order

1. Post the Reddit draft to r/CanvasLMS.
2. Submit the listing blurb to mcp.so.
3. Submit to Smithery.
4. Submit to Glama, using `glama.md`.
5. Submit to PulseMCP, using `pulsemcp.md`.

One channel a week is enough. Check each listing once it is live and fix anything that got cut off in the form.
