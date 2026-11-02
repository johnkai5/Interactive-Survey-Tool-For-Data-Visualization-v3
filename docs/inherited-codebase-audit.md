# Inherited-Codebase Audit

Audit of the v2 codebase
(`beheyx/Interactive-Survey-Tool-For-Data-Visualization-v2`) taken over for v3.
Done in fall weeks 1 to 5. Snapshot date: 2026-11-01.

## What Runs and How

- The app is six Docker Compose services: `main-ui`, `main-api`, `visual-ui`,
  `visual-api`, and two MySQL databases. [design.md](design.md) describes
  them.
- `docker compose up --build` starts the stack with the values in `.env`. The
  main app is at `http://localhost:5000/` and the visualization editor is at
  `http://localhost:8000/{id}`.
- Working at this commit: registration and login, visualization upload (SVG,
  PNG, JPEG), survey design editing with eight question types, publishing,
  taking a survey through its link, and Excel and ZIP results export.

## What Does Not Run, or Runs Badly

- The setup steps in `AGENTS.md` and `CONTRIBUTING.md` say to rename
  `.env.local`, but that file does not exist.
- `make_containers_NO_API.sh` starts standalone MySQL containers that the
  setup steps then stop straight away. Compose creates its own databases, so
  this step is probably unnecessary. It still needs testing on a clean clone.
- `dockerignore` is missing its leading dot, so Docker ignores it and copies
  `node_modules` and other local files into images.
- `docker-compose.prod.yml` has never been deployed. Its `visual-api` service
  waits for `mysql-main` instead of `mysql-visual`, and `main-ui` is not given
  `VISUAL_UI_URL`.
- Uploaded images are stored on the `visual-ui` container's disk and are lost
  when the container is rebuilt.

## Tests and CI

- Jest with Supertest and an in-memory SQLite database. 9 suites and 127
  tests, all passing. Statement coverage is 87%.
- Coverage only counts files the tests load. The UI servers
  (`main/ui/server.js`, `visualization/ui/server.js`) and most front-end
  modules are not measured.
- `CONTRIBUTING.md` and `AGENTS.md` describe Cypress E2E tests and
  `.markdownlint.yml`. Neither exists.
- CI (`.github/workflows/docker-compose-build.yml`) runs on pull requests and
  pushes to `main`. It builds the stack and runs `npm test`. It does not lint,
  enforce coverage, or audit dependencies. GitHub Actions was not enabled on
  the v3 repository at first, so there is no CI history before v3.

## Dependencies and Their Age

- Runtime: Node 18 in the Dockerfile (end of life), Express 4, Handlebars
  4.7, Sequelize 6, mysql2 3, multer 1.4 LTS, bcryptjs 2.4.3 (2017),
  json2csv 6.0.0-alpha.2 (a pre-release).
- `npm audit` reports known vulnerabilities, including critical and high ones.
  `npm outdated` shows major versions pending for Express, multer,
  body-parser, and dotenv.
- MySQL uses the `mysql:latest` image, so the database version is not pinned.

## Open Risks and Known Debt

The ranked risks are in [risks.md](risks.md). The main debt behind them:

- Schema changes go through `sync({ alter: true })` with no migrations.
- Published survey results are one JSON column per survey.
- `main/ui/server.js` is about 1,250 lines in one file, with a catch-all
  `POST /:resource/:id?/:method?` route.
- `documents/API_spec.txt` is out of date compared with the routes.
- `README.md` still describes v2 and its team.

## Predecessor Handoff and Retrospective

No handoff document or project retrospective from the v2 team was found. What
the repository itself hands over:

- Five decision records in `documents/adr/`: keep Handlebars instead of a
  front-end framework, table layouts for the dashboard, Bootstrap for styling,
  lasso regions stored as polygons, and one shared Handlebars layout.
- Six open issues labeled "Previous year issue" (#5 to #10), carried over as
  known bugs and enhancements. Three of them (#5, #6, #7) mention a hosted
  version. No record of where it ran was found, so v3 assumes there is no
  existing deployment.
- A suggestion to improve the login system, which is now an open RFC
  (`documents/adr/Xiyuan-Liang-RFC-Draft.md`).

## Upstream Contribution Rules

v3 is a separate repository, not a fork that sends changes back. The rules we
inherited from v2 are in `CONTRIBUTING.md`: feature branches, pull requests
into `main` with at least one approving review, Conventional Commits, and the
pull request template in `.github/PULL_REQUEST_TEMPLATE.md`.

## What We Will Change First

1. Get CI green on a named commit and make sure it goes red when a test
   breaks.
2. Make secret handling production-ready (risk R2).
3. Agree the production target and fix `docker-compose.prod.yml` (R1).
4. Correct the setup steps in `README.md`, `CONTRIBUTING.md`, and
   `AGENTS.md` so they work from a clean clone.
5. Upgrade dependencies with known vulnerabilities and the Node base image
   (R3).
6. Then start v3 features once they are confirmed with the partner.

## Where the Findings Live

- Constraints: [requirements.md](requirements.md), under Constraints.
- Architecture, and decisions to keep or replace: [design.md](design.md).
- Risks: [risks.md](risks.md).
- Conventions and pitfalls for AI tools and new contributors: `AGENTS.md`.
