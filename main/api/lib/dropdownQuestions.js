// Removes per-element dropdown questions (attributes written by the visual editor, see
// visualization/ui/public/src/features/dropdownQuestionData.js) when a question changes type.

// Must match the type name in main/ui/public/src/questionTypes.mjs; it is the key stored on each question.
const SELECT_DROPDOWN_TYPE = "Select Elements + Dropdown"

// Attribute values are written by XMLSerializer, which always uses double quotes and escapes any
// quote inside the value, so a value never contains a raw double quote.
const DROPDOWN_ATTRIBUTES = /\s+dropdown-(?:question|choices)="[^"]*"/g

function stripDropdownQuestions(svg) {
    return typeof svg === "string" ? svg.replace(DROPDOWN_ATTRIBUTES, "") : svg
}

// newType is undefined when the update does not set a type
function leavesDropdownType(oldType, newType) {
    return oldType === SELECT_DROPDOWN_TYPE && newType !== undefined && newType !== SELECT_DROPDOWN_TYPE
}

module.exports = { SELECT_DROPDOWN_TYPE, stripDropdownQuestions, leavesDropdownType }
