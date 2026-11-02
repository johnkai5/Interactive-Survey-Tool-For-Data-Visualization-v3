# Risk Register

This is the project's only risk register. It covers business, technical, and
team risks, ranked by likelihood times impact, each with one owner. Update it
at least once between repo checkpoints.

Last reviewed: 2026-11-01.

Scale: Likelihood (L) and Impact (I) are scored 1 (low) to 3 (high). Score is
L × I. Rank 1 is the highest score.

## Risks

| Rank | ID | Type | Risk | L | I | Score | Owner | Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R1 | Business | No production host is agreed yet. Getting an account or server can take weeks, and the walking skeleton must be deployed by fall week 10. | 3 | 3 | 9 | Kai Johnson | Ask the partner and decide the production target by 2026-11-07, then request access the same week. See prerequisite P1. |
| 2 | R2 | Technical | Secret handling is not ready for production. | 3 | 3 | 9 | Kai Johnson | Move every secret to untracked, per-environment configuration and set new values before the first deploy. Details are kept out of this public file. |
| 3 | R3 | Technical | Dependencies are out of date and `npm audit` reports known vulnerabilities, including critical ones. The Docker base image (`node:18`) is past end of life. | 3 | 2 | 6 | Kai Johnson | Upgrade in small, reviewed pull requests, one major version at a time, with CI passing after each. Tracked in issue #31. |
| 4 | R4 | Technical | The schema changes through `sync({ alter: true })` with no migrations or backups, so a model change can damage production data and a code rollback will not undo it. | 2 | 3 | 6 | Collin Vassallo | Back up both databases before each deploy. Move to migrations before real participant data exists. |
| 5 | R5 | Technical | Uploaded images live on the `visual-ui` container's disk, so they are lost when the container is rebuilt. | 2 | 3 | 6 | Norman Nomie | Mount a named volume for `visualization/ui/uploads/` in the production Compose file, or move images into storage that persists. |
| 6 | R6 | Technical | CI only builds and runs Jest. It does not lint, enforce coverage, or audit dependencies, and coverage does not include the UI servers. | 2 | 2 | 4 | Kai Johnson | Add markdownlint, a coverage threshold, and `collectCoverageFrom` to CI, in separate reviewed pull requests. Tests running after the stack shuts down is tracked in issue #16. |
| 7 | R7 | Team | The team inherited the codebase and only one member worked on v2, so knowledge of the code is thin. | 2 | 2 | 4 | Kai Johnson | Keep `docs/design.md` and `AGENTS.md` current. Pair on the first change in each service. |
| 8 | R8 | Technical | Authentication has no token revocation on logout and no login rate limit. | 2 | 2 | 4 | Xiyuan Liang | Decide the authentication RFC (`documents/adr/Xiyuan-Liang-RFC-Draft.md`) before the production deploy. |

## External Prerequisites

| ID | Prerequisite | Needed for | Asked of | Asked by | Date asked | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Production host or account for the walking skeleton | Repo Checkpoint 2 deploy (R1) | Project partner | Kai Johnson | Not yet asked; will ask by 2026-11-07 | Open |
| P2 | Partner agreement on the production target in `docs/design.md` | Repo Checkpoint 1 milestone | Project partner | Kai Johnson | Not yet asked; will ask by 2026-11-07 | Open |
| P3 | Domain name and TLS certificate for the participant link, if the chosen host does not provide them | Public participant links | Host owner, once P1 is decided | Kai Johnson | Not yet asked; depends on P1 | Open |
| P4 | Data handling or IRB requirements for participant responses, if any | Collecting real responses | Project partner | Kai Johnson | Not yet asked; will ask with P1 by 2026-11-07 | Open |

## Plan for Staging and Rollback

See "Staging and rollback" under Deployment in [design.md](design.md).
Not planned yet. It will be planned once the production target is decided.
