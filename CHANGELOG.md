# Changelog

All notable user-visible changes to this project are documented in this file.

## [Unreleased]

### Added

- New question type, Select Elements + Dropdown. In the visual editor, the
  new Element Questions tool adds a question with answer choices to any
  element. Participants click each highlighted element and pick an answer
  from its dropdown. Results and exports list each element with its question
  and answer. Changing the question to another type keeps its element
  questions until you click Save Changes, so switching back loses nothing.

### Fixed

- The CI workflow now runs `npm test` before `docker compose down`, so tests
  no longer run after the Docker stack has been shut down.
- Visualizations with many SVG elements no longer slow down each time the
  editor switches tools. Tooltip listeners used to be added to every element
  again on each tool switch, so they piled up.
- In the detail editor, labels can now be saved on the first element of a
  visualization. Before, the Modify button ignored it.

### Changed

- The save progress bar in the visualization editor now appears only when a
  save takes longer than 1 second, or right away if the previous save did.
  Quick saves no longer flash the bar. When a save finishes, the status text
  shows "Changes saved at" with the time, so each save is still confirmed.
  An hourglass appears before the status text while a save is running and
  disappears when it finishes. While the progress bar is showing, it replaces
  the hourglass and status text. The bar's text reads "Saving" with the file size and then
  "Complete!" for every file size, instead of separate upload steps for large
  files. Screen readers announce the save status.
- Clicking, hovering and selecting elements now use one shared listener on the
  visualization instead of several listeners per element. This makes large
  SVGs load faster and use less memory.
- Wheel zoom and panning update the view at most once per animation frame. Fast
  trackpad scrolling gives the same zoom with fewer repaints.
- The home page and About pages now list the version 3 team. Former team
  members moved to the Past Contributors list on the home page.
- In the question editor, the Question Type field now comes before the
  Question Text field, since the type decides which other fields apply.

### Developer

- Front-end modules can now be unit tested with Jest in a jsdom environment.
  This adds the `jest-environment-jsdom` and `@babel/preset-env` dev
  dependencies and a `babel.config.js` that only Jest uses.
- Jest now also transforms `.mjs` files, so `questionTypes.mjs` and its
  helpers can be unit tested.
- The visualization UI now reads `MAIN_UI_URL`. The visual editor only accepts
  editor-changing messages from the main app's origin, so set it wherever the
  visualization UI runs. `docker-compose.prod.yml` now passes it to the
  `visual-ui` service.
