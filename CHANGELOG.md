# Changelog

All notable user-visible changes to this project are documented in this file.

## [Unreleased]

### Fixed

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

### Developer

- Front-end modules can now be unit tested with Jest in a jsdom environment.
  This adds the `jest-environment-jsdom` and `@babel/preset-env` dev
  dependencies and a `babel.config.js` that only Jest uses.
