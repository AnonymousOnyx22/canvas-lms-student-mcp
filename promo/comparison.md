# Comparison post pack

A draft to post where someone asks which student MCP server to use, or to put in a listing field that asks how this server compares with others. The README compares Canvas MCP with brightspace-mcp-server, and this is the longer copy for the same comparison.

Use it as a blog post, a reply, or the "how is this different" box on a directory. Change the opening line to fit the place you paste it. Everything below comes from this repo and from the two server READMEs. Check both READMEs before you post, in case a tool changed.

## Full post

```markdown
# Canvas MCP compared with brightspace-mcp-server

If your school uses Canvas LMS by Instructure, install Canvas MCP. If your school uses D2L Brightspace, install brightspace-mcp-server. Both are free and open source, both run with npx, and neither can submit work, change a grade or delete anything in your school account. I maintain both servers, so this is not a knock at either one. The right pick is the server that matches the LMS your school runs.

## What Canvas MCP gives you

Canvas MCP is one server with 13 tools. Twelve of them only read from Canvas. The 13th writes an .ics calendar file on your own computer, and only when you ask for one. Nothing in the set can turn in work, edit a grade or post to a discussion.

The 13 tools cover:

- Courses and to do: `get_my_courses` and `get_todo`
- Due dates and missing work: `get_upcoming_due_dates`, `get_missing_assignments` and `get_assignments`
- Grades: `get_my_grades`, with the assignments behind each course grade
- Course material: `get_course_content` for modules, `get_syllabus` and `get_discussions`
- Catch up: `get_announcements` and `get_whats_new`
- Calendar: `get_calendar_events` and `export_due_dates_calendar`

Where a tool works on one course, you can give the Canvas course ID or the course name. "What is due in Networking 1" works as well as the number. A name that fits no course says so and points back at `get_my_courses`.

## Sign in: a token against a school login

Canvas MCP reads two environment variables. `CANVAS_BASE_URL` is your school's Canvas address. `CANVAS_API_TOKEN` is a token you make in Canvas under Account, Settings, New Access Token. You paste both into your MCP app's config and restart the app. Run `npx canvas-lms-student-mcp doctor` once to check the pair before you start.

brightspace-mcp-server takes the other route. It signs in with your school login through a one time setup command, so there is no token to copy.

Neither route sends your details to a third party. The Canvas token stays on your computer and is only sent to your own school's Canvas address. You can revoke it in Canvas settings at any time, and a revoked token stops working.

The token route has one catch. Some schools turn off student access tokens. If the New Access Token button is missing from your Canvas settings, Canvas MCP cannot connect, because the token is its only way in. Check that before you spend time on the config.

## The .ics export

`export_due_dates_calendar` turns your Canvas due dates and Canvas calendar events into an iCalendar file. The file imports into Google Calendar, Apple Calendar and Outlook.

By default it looks 30 days ahead and includes only the work you still owe. `days_ahead` changes the window, `course_id` limits it to one course by ID or name, and `include_submitted` adds the work you already handed in. Each event carries the course name, the points, the submission status, a link back to Canvas and a reminder the day before.

Give it a folder in `path` and the file is saved there. Leave `path` out and the calendar text comes back, so you can save it under any name you like. The name has to end in `.ics`, and the default is `canvas-due-dates.ics`.

This is the one tool that writes anything. It writes that file on your computer and nothing else, and it never changes Canvas.

## The target grade calculator

`get_my_grades` shows the current grade for each active course from the Canvas gradebook, plus the assignments behind it: your score, the points possible and the submission status. That is enough to see where a grade stands and which pieces are pulling it down.

What it does not do is work out what you need on a future assignment to reach a target grade. That math lives in a second server, GPA Calculator MCP. It is free and open source, and it works offline with no account. Pair the two and a question like "what do I need on the final to finish with a B" has the Canvas numbers and the math in one place.

brightspace-mcp-server has a target grade calculator built in, so on Brightspace that is one server instead of two. On Canvas it is two, and the second one does not need your Canvas login.

## Side by side

| | Canvas MCP | brightspace-mcp-server |
| --- | --- | --- |
| LMS | Canvas by Instructure | D2L Brightspace |
| Free and open source | Yes | Yes |
| Changes nothing in the LMS | Yes | Yes |
| Runs with npx | Yes | Yes |
| Sign in | Canvas API token | School login through a one time setup command |
| Tools | 13 for Canvas | Its own set for Brightspace |
| Target grade calculator | Pair with GPA Calculator MCP | Built in |

## Which one to install

If your school runs Canvas, install Canvas MCP and add the two environment variables. If your school runs Brightspace, install brightspace-mcp-server and run its setup command. Both projects explain their setup in their README, and both ship a doctor command or a setup command that checks the connection before you start asking questions.

If you are not sure which LMS your school uses, check the help pages your school posts for students, or ask your instructor. Installing the wrong one will not break anything, it just will not find your courses.

- Canvas MCP: https://github.com/AnonymousOnyx22/canvas-lms-student-mcp
- brightspace-mcp-server: https://github.com/AnonymousOnyx22/brightspace-d2l-mcp
```

## Short version

For a reply, a comment or a listing field with a tight limit. The first paragraph is the whole answer if the field is very short.

```text
Canvas MCP and brightspace-mcp-server do the same job for two different LMSs. Canvas MCP has 13 tools for Canvas by Instructure, twelve of them read only, covering courses, to do, due dates, missing work, grades, modules, syllabus, announcements, discussions, calendar events and an .ics calendar export. It signs in with a Canvas API token you create yourself. brightspace-mcp-server signs in with your school login through a one time setup command, and it has a target grade calculator built in. Both are free and open source, and neither changes anything in your school account. Pick the one that matches your school. For target grade math on Canvas, pair Canvas MCP with GPA Calculator MCP.
```

One line, for a table that already has the links:

```text
Canvas MCP covers Canvas with 13 read only style tools and an .ics export, while brightspace-mcp-server covers Brightspace with a school login and a target grade calculator.
```

Replace the previous block with this if the table has no links, since it needs a link to be useful. That sentence is not needed in the post itself.

## Facts this draft is built on

All of these come from the code, the README or the other server's README. If one stops being true, fix the draft before posting.

- Package `canvas-lms-student-mcp`, run with `npx -y canvas-lms-student-mcp`. Node 20 or newer. MIT license.
- Two environment variables: `CANVAS_BASE_URL` and `CANVAS_API_TOKEN`. The token is made in Canvas under Account, Settings, New Access Token. `npx canvas-lms-student-mcp doctor` checks both.
- 13 tools: `get_my_courses`, `get_todo`, `get_upcoming_due_dates`, `get_missing_assignments`, `get_assignments`, `get_my_grades`, `get_course_content`, `get_syllabus`, `get_announcements`, `get_whats_new`, `get_discussions`, `get_calendar_events`, `export_due_dates_calendar`.
- Twelve tools are read only. `export_due_dates_calendar` is the 13th and writes one .ics file on your computer. No tool submits, edits or deletes anything in Canvas.
- The export holds the next 30 days by default and only work you still owe. `days_ahead`, `course_id`, `include_submitted`, `path` and `filename` change what it writes. The default file name is `canvas-due-dates.ics`.
- `get_my_grades` returns the Canvas gradebook score and the assignments behind it. It does not calculate a target grade or a needed score.
- GPA Calculator MCP does grade and target grade math and works offline, with no account.
- brightspace-mcp-server signs in with a school login through a one time setup command and has a target grade calculator.
- Both servers can be installed with npx, both are free and open source, and neither changes anything in the LMS.

## Keep it true

- No prices, user counts or tool counts for the other server. If you want to mention its tools, say "its own set for Brightspace" and link its README.
- No tool names from the other server unless its README shows them today.
- If a Canvas MCP tool changes, update the 13 tool list, the twelve read only count and the short version in the same edit.
- Keep the draft in plain words. Say "read only", "open source" and "one time setup", not the hyphenated forms.
