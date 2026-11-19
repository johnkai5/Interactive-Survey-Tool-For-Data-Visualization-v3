// Server-side handling of per-element dropdown questions ("Select Elements + Dropdown").
//
// The questions live on the question's own copy of the SVG, as attributes written by the visual
// editor (visualization/ui/public/src/features/dropdownQuestionData.js). When the question is changed
// to another type they no longer mean anything, so they are removed rather than left behind.

// Must match the type name in main/ui/public/src/questionTypes.mjs; it is the key stored on each question.
const SELECT_DROPDOWN_TYPE = "Select Elements + Dropdown"

// Attribute values are written by XMLSerializer, which always uses double quotes and escapes any
// quote inside the value, so a value never contains a raw double quote.
const DROPDOWN_ATTRIBUTES = /\s+dropdown-(?:question|choices)="[^"]*"/g

/**
 * Removes every per-element dropdown question from an SVG string.
 * @param {string} svg
 * @returns {string}
 */
function stripDropdownQuestions(svg) {
    return typeof svg === "string" ? svg.replace(DROPDOWN_ATTRIBUTES, "") : svg
}

/**
 * True when saving this change takes a question away from the dropdown type.
 * @param {string} oldType type stored on the question
 * @param {string|undefined} newType type in the update, if the update sets one
 * @returns {boolean}
 */
function leavesDropdownType(oldType, newType) {
    return oldType === SELECT_DROPDOWN_TYPE && newType !== undefined && newType !== SELECT_DROPDOWN_TYPE
}

module.exports = { SELECT_DROPDOWN_TYPE, stripDropdownQuestions, leavesDropdownType }
