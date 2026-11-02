# Technical Design

This document describes the system as it exists at this commit. The
requirements it serves are in [requirements.md](requirements.md). Older decision
records live in `documents/adr/`.

## Context

```text
 Researcher (browser) ──┐                    ┌── Participant (browser, no account)
                        ▼                    ▼
                 ┌──────────────────────────────────┐
                 │ main-ui :5000 (Express+Handlebars)│
                 └───────┬──────────────────┬────────┘
                         │ REST + JWT       │ iframe / image fetch
                         ▼                  ▼
          ┌──────────────────────┐   ┌──────────────────────┐
          │ main-api :5050       │   │ visual-ui :8000      │
          │ users, designs,      │   │ visualization editor │
          │ questions, published │   │ and viewer           │
          └─────────┬────────────┘   └─────────┬────────────┘
                    ▼                          ▼
          ┌──────────────────────┐   ┌──────────────────────┐
          │ mysql-main           │   │ visual-api :8080     │
          │ (MySQL, volume)      │   │ SVG storage          │
          └──────────────────────┘   └─────────┬────────────┘
                                               ▼
                                     ┌──────────────────────┐
                                     │ mysql-visual         │
                                     │ (MySQL, volume)      │
                                     └──────────────────────┘
```

There are four Node.js services and two MySQL databases, all defined in
`docker-compose.yml`. Every Node service is built from the same `Dockerfile`
and the same source tree. Only the start command differs. An older diagram is
in `documents/archictecture.png`.

| Service | Entry point | Role |
| --- | --- | --- |
| `main-ui` | `main/ui/server.js` | Renders all researcher and participant pages with Handlebars. Calls `main-api` with the user's JWT, which is kept in an `access_token` cookie. Builds the Excel and ZIP results exports. |
| `main-api` | `main/api/server.js` | REST API for users, visualizations (metadata), survey designs, questions, and published surveys. Issues and checks JWTs. |
| `visual-ui` | `visualization/ui/server.js` | Serves the visualization editor and viewer (`visualization/ui/public/src/`). Stores uploaded PNG and JPEG files on disk in `visualization/ui/uploads/`. Renders marked responses to PNG with `@resvg/resvg-js`. |
| `visual-api` | `visualization/api/server.js` | Stores SVG content and display settings. Has no authentication. It is meant to be reached only from inside the Compose network. |

## Interfaces and Contracts

### main-api

All routes except register, login, logout, and the participant routes need an
`Authorization: Bearer <JWT>` header. The token's `sub` is the user's ID and
it expires after 24 hours (`main/api/lib/auth.js`). Requests for another
user's resource return `401`.

| Method and path | Purpose |
| --- | --- |
| `POST /users`, `POST /users/login`, `POST /users/logout` | Register, log in, log out |
| `GET /users/:id/{visualizations,surveyDesigns,publishedSurveys}` | List a user's resources |
| `POST/GET/PATCH/DELETE /visualizations[/:id]` | Visualization metadata |
| `POST /visualizations/content/:contentId/touch` | Update a visualization's last-modified time after the engine changes its content |
| `POST/GET/PATCH/DELETE /surveyDesigns[/:id]`, `POST /surveyDesigns/:id/duplicate` | Survey designs |
| `GET/POST /surveyDesigns/:id/questions` | List or add questions |
| `GET/PATCH/DELETE /questions/:id`, `POST /questions/:id/{moveUp,moveDown}` | Edit and reorder questions |
| `POST /surveyDesigns/:id/publishedSurveys` | Publish a snapshot of a design |
| `GET/PATCH/DELETE /publishedSurveys/:id` | Manage a published survey |
| `GET /takeSurvey/:hash`, `PATCH /takeSurvey/:hash` | Participant: load a survey, submit a response. No authentication. |

`documents/API_spec.txt` is the inherited API description. Where it disagrees
with the routes above, the routes are right.

### visual-api

| Method and path | Purpose |
| --- | --- |
| `GET /:id` | Get SVG content and settings |
| `POST /` | Create an empty visualization |
| `POST /:id/upload/{init,chunk,finalize}` | Chunked upload for large SVGs |
| `PUT /:id` | Replace SVG content or settings |
| `DELETE /:id` | Delete |

### visual-ui

`visual-ui` serves the editor at `GET /:id` and proxies uploads to `visual-api`.
It also serves `/:id/photo` (uploaded raster images), `/:id/svg-data`, and
`/:id/marked.png` and `/:id/marked-region.png` (a participant's marks drawn
onto the visual, used by the ZIP export).

### Front-end extension points

- **Question types** are defined in one place,
  `main/ui/public/src/questionTypes.mjs`. A new type is one object in that
  array.
- **Editor features** (zoom and pan, select elements, mark points, region
  select, tooltips, export) are modules in
  `visualization/ui/public/src/features/`. Start from
  `00_NEW_FEATURE_TEMPLATE.js`. Element events use one delegated listener
  (`elementEvents.js`) instead of a listener per SVG element, so large SVGs
  stay fast.

## Data Model

### mysql-main (Sequelize models in `main/api/model/`)

| Table | Key fields | Relations |
| --- | --- | --- |
| `users` | `name` (unique), `password` (bcrypt hash) | Has many visualizations, survey designs, and published surveys |
| `visualizations` | `name`, `contentId` | Belongs to a user. `contentId` is the ID of the row in `mysql-visual`. This is not a foreign key. |
| `surveyDesigns` | `name`, `title`, `introText`, `conclusionText` | Belongs to a user. Has many questions. |
| `questions` | `number`, `text`, `type`, `required`, `allowComment`, `commentText`, `min`, `max`, `choices`, `disableZoom`, `disablePan`, `visualizationContentId` | Belongs to a survey design |
| `publishedSurveys` | `name`, `openDateTime`, `closeDateTime`, `status`, `linkHash`, `surveyDesign` (JSON), `questions` (JSON), `results` (JSON) | Belongs to a user |

`status` is worked out from the open and close times every time it is read.
`linkHash` is the SHA-256 of the published survey's ID, and it is the
participant's link. Responses are appended to `results.participants`.

### mysql-visual (`visualization/api/model/Visualization.js`)

| Table | Key fields |
| --- | --- |
| `visualizations` | `svg` (LONGTEXT), `detailsOnHover` |

Uploaded PNG and JPEG files are not stored in either database. They are files
in `visualization/ui/uploads/` inside the `visual-ui` container.

Both APIs call `sequelize.sync({ alter: true })` on startup, so model changes
alter tables directly. There are no migrations.

## Deployment

### Today

- **Local development:** `docker compose up --build` with the values in
  `.env`, as described in the README. Source is bind-mounted into the
  containers.
- **Production shape:** `docker-compose.prod.yml` runs the same six services
  without bind mounts and with fixed internal URLs. It has never been deployed
  by this team.
- **CI:** `.github/workflows/docker-compose-build.yml` builds and starts the
  stack, then runs `npm test`, on every pull request and push to `main`.

### Production target (walking skeleton for fall week 10)

**Status: not yet decided or agreed.** No host has been chosen and the project
partner has not been asked yet. Kai Johnson owns this decision and will ask the
partner and record the outcome here by 2026-11-07. The candidates are an OSU
server, partner-provided infrastructure, or a cloud VM, each running the
`docker-compose.prod.yml` stack.

Because this is a year-long project, the partner may decide not to deploy in
fall. In that case this section will say why and name what ships instead, so
the instruction team can agree an equivalent milestone.

If it is deployed, the walking skeleton is the thinnest slice that crosses
every service: a researcher registers, uploads an SVG, adds one Select Elements
question, and publishes, and a participant answers through the link.

The approvals this needs are tracked in [risks.md](risks.md).

### Staging and rollback

Not planned yet. Staging and rollback depend on the production target, so they
will be planned once the target is decided.

## Decisions Deferred on Purpose

- **Authentication changes.** Token revocation on logout, login rate limits,
  and third-party login are proposed in
  `documents/adr/Xiyuan-Liang-RFC-Draft.md` and not yet decided.
- **Migrations.** Replacing `sync({ alter: true })` with Sequelize migrations
  waits until the production database exists.

## Open Technical Questions

- Should uploaded images move from the `visual-ui` container's disk to a
  volume or object storage? Today they are lost if the container is rebuilt
  without a volume.
- Can `visual-api` stay unauthenticated in production if it is reachable only
  inside the Compose network?
- Will storing results as JSON in one row still work for surveys with
  thousands of participants?
