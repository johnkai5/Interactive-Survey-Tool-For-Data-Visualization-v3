# Changelog

All notable user-visible changes to this project are documented in this file.

## [Unreleased]

### Added

- New question type, Select Elements + Dropdown. In the visual editor, the
  new Element Questions tool adds a question with answer choices to any
  element. Participants click each highlighted element and pick an answer
  from its dropdown. Results and exports list each element with its question
  and answer.

### Fixed

- Visualizations with many SVG elements no longer slow down each time the
  editor switches tools. Tooltip listeners used to be added to every element
  again on each tool switch, so they piled up.
- In the detail editor, labels can now be saved on the first element of a
  visualization. Before, the Modify button ignored it.

### Changed

- Clicking, hovering and selecting elements now use one shared listener on the
  visualization instead of several listeners per element. This makes large
  SVGs load faster and use less memory.
- Wheel zoom and panning update the view at most once per animation frame. Fast
  trackpad scrolling gives the same zoom with fewer repaints.

### Developer

- Front-end modules can now be unit tested with Jest in a jsdom environment.
  This adds the `jest-environment-jsdom` and `@babel/preset-env` dev
  dependencies and a `babel.config.js` that only Jest uses.
- Jest now also transforms `.mjs` files, so `questionTypes.mjs` and its
  helpers can be unit tested.
