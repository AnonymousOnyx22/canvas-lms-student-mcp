# Changelog

## Unreleased

- get_upcoming_due_dates takes an optional days_ahead parameter, so a question such as "what is due in the next 3 days" can be answered with only that window. Leave the parameter out and the tool returns every upcoming due date Canvas lists, as before. The tool name and the existing output did not change.

- get_announcements and get_whats_new take optional limit and page parameters to step through long lists, 20 items per list by default. Existing output and parameters did not change.

- New tool get_submission_feedback shows your score and your instructor's comments on one graded assignment. Pass course_id and the assignment ID or name, like Lab 4.

## 0.1.7

- Added get_assignment_files. Pass course_id and an assignment ID or name and it lists the files linked in that assignment's instructions, such as a handout or a rubric, with the file name, type, size and a link. It only reads file details and does not download the files. The README and llms.txt now count fourteen read only tools. The existing tools and their parameters did not change.

## 0.1.6

- Added get_target_grade to compute what score is needed on the remaining Canvas work in one course to reach a target percent. Pass course_id and target_percent, and optionally current_percent to use the percent Canvas reports. The tool uses the tested helper in src/grades.ts, ignores work that does not count toward the course grade, and reports needed points and percent, best and worst finish, and whether the target is held or out of reach. The tool list, docs and metadata were updated to include the new tool. The versions, package name and bin did not change.

- The npm keywords now cover long tail searches as well as the main phrase. Alongside "canvas lms mcp" and its variants, the package lists terms people search for, such as "canvas assignment tracker", "canvas due date tracker", "canvas gradebook", "canvas missing assignments", "assignment tracker", "due date tracker", "homework tracker" and "what is due this week". A new test keeps those terms in the list and checks that no keyword is repeated. The tool names, the parameters and the versions did not change.

## 0.1.5

- A course can be named instead of numbered. Every tool that works on one course now takes a course name as well as a course id, so "my Networking 1 course" works as well as 12345. The name is looked up in the list get_my_courses shows, and it is matched by name, by course code and by part of the name. A name that fits no course says so and points back at get_my_courses, and a name that fits more than one course lists them so you can pick the id. The tool names, the parameter names and the versions did not change.

- Add export_due_dates_calendar. It turns your Canvas due dates and your Canvas calendar events into an .ics file you can import into Google Calendar, Apple Calendar or Outlook. Give it a folder and the file is saved there, leave the folder out and the calendar text comes back so you can save it yourself. The file holds the next 30 days and only the work you still owe, days_ahead, course_id and include_submitted change that. Every event carries the course name, the points, the submission status, a link back to Canvas and a reminder the day before. It never changes anything in Canvas, the only thing it writes is that one file on your own computer, so it is the one tool that is not marked read only. The other tools, their parameters and the versions did not change.

- Add get_whats_new, one call that sums up what changed in Canvas: announcements posted in the last few days, assignments graded in that window and discussions that still have unread replies, grouped into three sections. Pass since_days to change the window, 7 by default, or course_id to check one course only. The existing tools did not change.

## 0.1.4

- get_my_grades now shows the evidence behind each course grade. Under every course it lists the assignments that count toward the grade, meaning anything graded, submitted, missing or excused, with your score, the points possible and the submission status. An optional course_id limits the answer to one course. The tool name and the grade summary it already returned did not change.

- Add Ask like example prompts to README Tools table

- Deepen get_my_grades with per course assignment breakdown

- The server code still said 0.1.1 while the package said 0.1.4. The code now says 0.1.4 as well, so the version the server prints is the version on npm. A new test in tests/metadata.test.ts checks that package.json, server.json, glama.json, llms.txt and the server code all report 0.1.4, and that the twelve read only tools and the one calendar export still match what llms.txt and the README say. The tool names and the parameters did not change.

- The two registry files now carry the full set of metadata. server.json gained the title, the homepage, the license and the keywords. glama.json gained the name, the description, the version, the type, the license, the repository, the homepage and the keywords. The registry description stays inside the 100 character limit and the tool names, the parameters and the versions did not change. Both files are now in the files array of package.json, so the published tarball carries the registry metadata. A test checks the fields of both files and the files list.

- glama.json now lists get_my_courses, so the Glama directory card shows every tool instead of leaving one out. A test checks that glama.json lists every tool the server registers, with the description it has in the code, the way the README and llms.txt are checked. The tool names, the parameters and the versions did not change.

- The tool list has a test now. The test takes a snapshot of the names of the tools the server registers, so a tool cannot be dropped by accident, and it checks that every tool is registered with the description it has in the code. The same test checks that the README and llms.txt list every tool with the same description and the same example prompt, which caught that llms.txt did not mention get_my_courses. It does now. The tool names, the parameters and the versions did not change.

- The doctor command and the error messages have tests now. A fake Canvas server answers the doctor request with a good token, a bad token, access denied, a rate limit and a page that is not Canvas. Each case checks the exit code and what the message says. The 403 message and the message for a reply that is not Canvas JSON are checked as well. The doctor command and the tool names did not change.

- server.json now tells a listing site how to run the server and what to ask for. The npm package entry carries the npx runtime hint with the -y argument, the npm registry address, and the two environment variables the server reads: CANVAS_BASE_URL, which is required, and CANVAS_API_TOKEN, which is required and marked as a secret so a client handles it carefully. The repository block carries the GitHub repository id as well, and that id stays the same when a repository is renamed. The registry description, the tool names, the parameters and the versions did not change. New tests in tests/metadata.test.ts check the runtime hint, the listed environment variable names against the ones the code reads, the required and secret flags and the repository id.

- The metadata test no longer writes the version and the tool counts down by hand. It takes the version from package.json and counts the read only tools from the code, then checks that server.json, glama.json, llms.txt and the server code report that same version, and that llms.txt and the README spell out the same number of read only tools. A release now means changing the version in one place, and a new tool means updating the docs with the number the test asks for. The tool names, the parameters and the versions did not change.

## 0.1.3

- Updated the development tools. TypeScript moved from 5.6 to 7, Vitest from 2.1 to 4.1 and the Node type definitions from 22 to 26, so a fresh install no longer pulls old packages. The tsconfig now names the Node types so TypeScript 7 finds them. The README shows a CI badge that points at the workflow that runs the build and the tests, and a new test checks that the badge and the workflow file still match. The package name, the version, the tool names and the runtime dependencies did not change.

- Rewrote the npm description and the keywords around the phrase "canvas lms mcp", which is what people type into npm search. The description now starts with "Canvas LMS MCP" and stays short so the phrase carries the weight, and the keywords put the phrase and its variants first. The registry description in server.json says the same thing in 98 characters. Added a test that keeps both descriptions on the phrase and the registry description under 100 characters. The package name, the version and the tool names did not change.

- Errors are now actionable. A bad or expired token says how to make a new one and to run the doctor command. 403 and 429 include the message Canvas sent back, and a 429 repeats how long Canvas asked you to wait. An unreachable host, a host that is not Canvas, and an empty or non-JSON reply all blame `CANVAS_BASE_URL` and show a correct example address. The tool names and parameters did not change.

- Rewrote every tool description to say it works with Canvas and to end with an example prompt, so AI apps can pick the right tool and see how course_id and submission status work. The tool names and parameters did not change. Added a test that keeps every description that way.

- Rewrote the package description and the README opening around the phrase "canvas lms mcp" for npm search, and trimmed the keywords to the same phrase and its parts. No code changed.

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

## 0.1.1

- README now lists every free student MCP server from the same author. Nothing else changed.

## 0.1.0

- First release. Read only tools for Canvas LMS by Instructure, a doctor command to check your setup, and tests that run against a fake server.
