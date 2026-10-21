# Changelog

## 0.1.4

- Add Ask like example prompts to README Tools table
- Deepen get_my_grades with per course assignment breakdown

## 0.1.3

- Small fixes and clearer docs

## 0.1.2

- Rewrite npm description and keywords around canvas lms mcp
- Refresh devDependencies and add a CI badge to the README
- Publish a canvas lms mcp awesome-list and listing pack in promo/
- Return actionable errors for bad Canvas tokens, 401/403 and rate limits
- Rename tools to canvashub-style verbs and add example prompts to every description
- Rework the README first screen: H1, one-line promise, install command, Canvas base URL env var
- Rewrite package.json description and keywords for "canvas lms mcp"
- Shorten the server.json description to 100 characters (it is 171)
- search-rank

## Unreleased

- Add export_due_dates_calendar. It turns your Canvas due dates and your Canvas calendar events into an .ics file you can import into Google Calendar, Apple Calendar or Outlook. Give it a folder and the file is saved there, leave the folder out and the calendar text comes back so you can save it yourself. The file holds the next 30 days and only the work you still owe, days_ahead, course_id and include_submitted change that. Every event carries the course name, the points, the submission status, a link back to Canvas and a reminder the day before. It never changes anything in Canvas, the only thing it writes is that one file on your own computer, so it is the one tool that is not marked read only. The other tools, their parameters and the versions did not change.

- glama.json now lists get_my_courses, so the Glama directory card shows every tool instead of leaving one out. A test checks that glama.json lists every tool the server registers, with the description it has in the code, the way the README and llms.txt are checked. The tool names, the parameters and the versions did not change.

- The tool list has a test now. The test takes a snapshot of the names of the tools the server registers, so a tool cannot be dropped by accident, and it checks that every tool is registered with the description it has in the code. The same test checks that the README and llms.txt list every tool with the same description and the same example prompt, which caught that llms.txt did not mention get_my_courses. It does now. The tool names, the parameters and the versions did not change.

- The doctor command and the error messages have tests now. A fake Canvas server answers the doctor request with a good token, a bad token, access denied, a rate limit and a page that is not Canvas. Each case checks the exit code and what the message says. The 403 message and the message for a reply that is not Canvas JSON are checked as well. The doctor command and the tool names did not change.

- Add get_whats_new, one call that sums up what changed in Canvas: announcements posted in the last few days, assignments graded in that window and discussions that still have unread replies, grouped into three sections. Pass since_days to change the window, 7 by default, or course_id to check one course only. The existing tools did not change.

- get_my_grades now shows the evidence behind each course grade. Under every course it lists the assignments that count toward the grade, meaning anything graded, submitted, missing or excused, with your score, the points possible and the submission status. An optional course_id limits the answer to one course. The tool name and the grade summary it already returned did not change.

- Updated the development tools. TypeScript moved from 5.6 to 7, Vitest from 2.1 to 4.1 and the Node type definitions from 22 to 26, so a fresh install no longer pulls old packages. The tsconfig now names the Node types so TypeScript 7 finds them. The README shows a CI badge that points at the workflow that runs the build and the tests, and a new test checks that the badge and the workflow file still match. The package name, the version, the tool names and the runtime dependencies did not change.
- Rewrote the npm description and the keywords around the phrase "canvas lms mcp", which is what people type into npm search. The description now starts with "Canvas LMS MCP" and stays short so the phrase carries the weight, and the keywords put the phrase and its variants first. The registry description in server.json says the same thing in 98 characters. Added a test that keeps both descriptions on the phrase and the registry description under 100 characters. The package name, the version and the tool names did not change.
- Errors are now actionable. A bad or expired token says how to make a new one and to run the doctor command. 403 and 429 include the message Canvas sent back, and a 429 repeats how long Canvas asked you to wait. An unreachable host, a host that is not Canvas, and an empty or non-JSON reply all blame `CANVAS_BASE_URL` and show a correct example address. The tool names and parameters did not change.
- Rewrote every tool description to say it works with Canvas and to end with an example prompt, so AI apps can pick the right tool and see how course_id and submission status work. The tool names and parameters did not change. Added a test that keeps every description that way.
- Rewrote the package description and the README opening around the phrase "canvas lms mcp" for npm search, and trimmed the keywords to the same phrase and its parts. No code changed.

## 0.1.1

- README now lists every free student MCP server from the same author. Nothing else changed.

## 0.1.0

- First release. Read only tools for Canvas LMS by Instructure, a doctor command to check your setup, and tests that run against a fake server.
