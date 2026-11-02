# Requirements

Version 3 of the Interactive Survey Tool for Data Visualization. This document
describes what the product must do. [design.md](design.md) describes how the
code at this commit does it.

## Problem Statement

Researchers at Oregon State University want to ask survey questions about a
visual, such as a map, a chart, or a diagram, and record exactly where on it a
participant clicked, marked, or drew a region. General survey platforms such
as Qualtrics only accept text and simple image answers. They cannot record
which SVG elements a participant selected, where they placed points, or which
region they outlined while zooming and panning. This tool lets researchers
build, publish, and export those surveys themselves.

## Users

- **Researcher (survey designer):** has an account, uploads visualizations,
  designs surveys, publishes them, and downloads the results.
- **Participant:** opens a published survey link, with no account, and answers
  it.

## Functional Requirements

Status: **Done** means the behavior exists at this commit.

| ID | Requirement | Status | Acceptance criterion or test |
| --- | --- | --- | --- |
| FR-1 | A researcher can register, log in, and log out. | Done | `__tests__/main/api/users.js` |
| FR-2 | API routes for a researcher's resources reject requests without a valid token, and a researcher cannot read another researcher's resources. | Done | `__tests__/main/api/*.js` (401 cases) |
| FR-3 | A researcher can upload a visualization as SVG, PNG, or JPEG, rename it, and delete it. | Done | `__tests__/main/api/visualizations.js`, `__tests__/visualization/api/visualizations.js` |
| FR-4 | Large SVG uploads succeed through chunked upload (init, chunk, finalize). | Done | `__tests__/visualization/api/visualizations.js` |
| FR-5 | A researcher can create, edit, duplicate, and delete a survey design with an intro and a conclusion. | Done | `__tests__/main/api/surveyDesigns.js` covers create, edit, and delete. Duplicate has no test yet: given a design with two questions, when it is duplicated, then the copy has the same two questions in the same order. |
| FR-6 | A survey design holds ordered questions of these types: Multiple Choice, Radio Choice, Short Answer, Write-in, Select Elements, Mark Points, Select Region, and No Response. Questions can be reordered. | Done | `__tests__/main/api/questions.js` |
| FR-7 | Visual question types can turn zoom and pan off per question. | Done | Given a question with `disableZoom` set, when a participant scrolls over the visual, then it does not zoom. |
| FR-8 | Publishing a survey design snapshots it, with its questions, and gives it an open time, a close time, and a shareable link. Later edits to the design do not change the published copy. | Done | `__tests__/main/api/surveyDesigns.js`, `__tests__/main/api/publishedSurveys.js` |
| FR-9 | A participant can take a published survey only while it is open. | Done | `__tests__/main/api/takeSurvey.js` |
| FR-10 | A researcher can download a published survey's results as an Excel workbook, or as a ZIP with the workbook and images of marked responses. | Done | Given a survey with one response, when the researcher downloads results, then the workbook has one participant row. |
| FR-11 | Clicking, hovering, and selecting visualization elements behave the same on large SVGs as on small ones. | Done | `__tests__/visualization/ui/elementEvents.js` |

## Non-Functional Requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| NFR-1 | Passwords are never stored in plain text. | Passwords are hashed with bcrypt before they are saved (`main/api/model/User.js`). |
| NFR-2 | Secrets come only from environment variables, never from source code. | No secret value appears in tracked source files. |
| NFR-3 | Automated tests cover at least 80% of statements. | `npm test -- --coverage` reports 80% or higher. It was 87% at the time of writing. |
| NFR-4 | Every pull request into `main` builds the full stack and runs the test suite in CI. | `.github/workflows/docker-compose-build.yml` passes. |
| NFR-5 | Results are kept after containers restart. | Data lives in the `mysql-main-data` and `mysql-visual-data` Docker volumes. |
| NFR-6 | The interface is usable with a keyboard and screen reader. | Lighthouse accessibility score of at least 90 on the survey-taking page. |

## Constraints

These are limits the team did not choose:

- **Inherited stack.** The code is Node.js, Express, Handlebars, Sequelize, and
  MySQL, run as Docker Compose services. ADR-001 records the decision to keep
  Handlebars instead of moving to React or Vue.
- **Two databases.** The main app and the visualization engine each have their
  own MySQL database. A visualization in the main database refers to the
  engine's record through `contentId`, not a foreign key.
- **Schema by `sync({ alter: true })`.** Sequelize changes tables on startup,
  and there are no migrations. Any model change alters production tables
  directly.
- **Large payloads.** SVGs can be many megabytes. That is why the API body
  limit is 50 MB and why uploads are chunked.
- **Published surveys are JSON snapshots.** The design, questions, and results
  of a published survey are stored as JSON columns, so results are not
  queryable with SQL.
- **Course timeline.** The skeleton must be deployed by fall week 10 (Repo
  Checkpoint 2).
- **Hosting and data handling.** No limits are known yet. They will be asked of
  the partner together with the production target by 2026-11-07 (prerequisites
  P1 and P4 in [risks.md](risks.md)).

## Success Metrics

These are proposed targets that have not been confirmed with the partner yet.

- A researcher can go from a new account to a published survey with one visual
  question in under 15 minutes without help.
- A participant can finish a five-question visual survey on a laptop with no
  errors.
- The visualization editor stays responsive on an SVG with 10,000 elements.

## Non-Goals

- Replacing general-purpose survey platforms for surveys without visuals.
- Participant accounts or participant identity tracking.
- Real-time collaborative editing of survey designs.
- Mobile-first design. Participants are expected to use a laptop or desktop.

## Open Questions

- Will authentication be improved in place or replaced with a third-party
  provider? This is open in `documents/adr/Xiyuan-Liang-RFC-Draft.md`.
- How long must survey results be kept, and who may access them?
