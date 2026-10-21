# Changelog

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
