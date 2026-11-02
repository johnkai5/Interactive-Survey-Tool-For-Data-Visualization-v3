# AGENTS.md

Instructions for AI coding agents working in this repository. Follow them so every change meets the Definition of Done and passes all CI quality gates.

## Project Documents

Read these before changing code. This file points at them rather than copying
them, so they are the source of truth when they disagree with anything here.

- `docs/requirements.md`: what the product must do, constraints, and non-goals.
- `docs/design.md`: services, API routes, data model, and deployment.
- `docs/risks.md`: the ranked risk register and external prerequisites.
- `docs/inherited-codebase-audit.md`: known gaps and pitfalls in the inherited
  code, including setup steps below that do not match the repository yet.
- `CONTRIBUTING.md`: branching, reviews, and commit conventions.

## Definition of Done

A change is done only when it:

- Meets the acceptance criteria and does not regress existing behavior.
- Includes tests (unit and integration).
- Passes all CI quality gates (lint, types, tests, a11y, perf, deps, etc.).
- Updates docs (README, API docs, CHANGELOG). Screenshots for UI changes are added by a human.
- Is reviewed and approved by a human before merging.

## Project Overview

- Containerized web application run with Docker Compose.
- Uses MySQL databases that are created by a helper script.
- Tested with Jest (unit and integration) and Cypress (E2E).

## Visual and Stylistic Changes: Ask First

Agents often cannot see visual errors, so visual and stylistic changes are made by humans. Ask before touching anything that affects how the app looks, including:

- CSS, SCSS, or any other stylesheet.
- Layout, spacing, colors, fonts, icons, images, and animations.
- Markup or component changes whose purpose is to change appearance.
- Responsive behavior and theming.

If a task requires one of these changes, stop, describe the change you would make and why, and wait for a human to approve it or make it.

## Architecture Changes: Never Unless Told To

Never make major architecture changes unless a human explicitly tells you to. This includes:

- Restructuring directories or moving modules between layers.
- Adding, removing, or swapping frameworks or major libraries.
- Changing database schemas or the data flow between services.
- Changing the Docker or Docker Compose service layout.
- Changing API contracts or endpoint structure.

If a task seems to need one of these, stop and explain the problem and your proposed approach instead of making the change.

## Setup

Prerequisites:

- Node.js (<https://nodejs.org>)
- Docker Desktop (<https://www.docker.com/products/docker-desktop>)

Run these steps once, in order. Skip any step that has already been done (for example, do not rename `.env.local` if `.env` already exists).

```bash
sed -i 's/\r$//' wait-for.sh
mv .env.local .env
bash make_containers_NO_API.sh
docker stop mysql-server-visualization
docker stop mysql-server-visual-survey
docker compose up --build
```

What each step does:

1. `sed` strips Windows line endings (CRLF) from `wait-for.sh` so it runs correctly in the container.
2. `mv` renames `.env.local` to `.env`.
3. `make_containers_NO_API.sh` retrieves the MySQL database needed by the app.
4. The two `docker stop` commands stop the standalone database containers.
5. `docker compose up --build` builds and runs the application.

## Running the App Locally

- Main app: `http://localhost:5000/`
- Visualization test endpoint: `http://localhost:8000/{VisualizationID}`. This endpoint does not write to databases, so use it for testing visualizations.

## Commands

| Task | Command |
| --- | --- |
| Run unit and integration tests (Jest) | `npm test` |
| Run E2E tests, headless (Cypress) | `npx cypress run` |
| Run E2E tests, interactive (Cypress) | `npx cypress open` |
| Lint Markdown | `npx markdownlint '**/*.md'` |
| Check dependency vulnerabilities | `npm audit` |
| Check outdated dependencies | `npm outdated` |
| Build and run the full stack | `docker compose up --build` |

## Testing

- Unit tests check individual components or functions.
- Integration tests verify modules or API interactions.
- E2E tests simulate full user flows in the browser.
- Coverage threshold is at least 80% for all code.
- Every new feature, bug fix, or logic change must include or update tests before merging.
- Run `npm test` before finishing any code change.

## Code Style, Linting, and Formatting

- Markdown is linted with markdownlint using the config in `.markdownlint.yml`.
- Run `npx markdownlint '**/*.md'` after editing any Markdown file and fix every warning.
- Comments and docstrings describe why the code does something, plus any invariants or assumptions. They should not restate what the code does.

## Security and Secrets

- Store secrets only in `.env`. It is gitignored and must never be committed.
- Use placeholder values (`FAKE_KEY`, `localhost`) in public configs.
- Never hard-code credentials, API keys, or secrets.
- Never commit `.env` or any sensitive configuration.
- Run `npm audit` and `npm outdated` before merging dependency changes.
- Do not disclose security vulnerabilities in public issues, PRs, or commit messages.

## Documentation Expectations

Update these when a change affects them:

- `README.md` for setup, run instructions, and notable changes.
- `docs/` for feature guides and architecture.
- `CHANGELOG.md` for user-visible changes.

## Agent Boundaries

Always:

- Write or update tests for any behavior change and keep coverage at or above 80%.
- Run `npm test` and the Markdown lint command before declaring work finished.
- Update the docs listed above when a change affects them.

Ask first:

- Any visual or stylistic change (see the Visual and Stylistic Changes section).
- Adding, removing, or upgrading dependencies.
- Changing CI workflows, Docker configuration, or database setup.

Never:

- Make major architecture changes unless explicitly told to.
- Commit `.env`, secrets, API keys, or credentials.
- Push directly to `main`.
- Merge or recommend merging a PR with failing checks.
- Run write operations against databases when the task only needs the visualization test endpoint.
