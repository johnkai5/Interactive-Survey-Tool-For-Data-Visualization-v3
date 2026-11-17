// Turns stored responses into text people can read in the results preview and spreadsheet exports.
//
// Most question types already store readable text, so they pass through unchanged. Types that store
// structured JSON get a formatter here, so instructors are not handed raw JSON in a spreadsheet cell.
// This is server-side CommonJS, used by main/ui/server.js and public/src/export/surveyZipExport.js.

// Must match the type name in public/src/questionTypes.mjs; it is the key stored on each question.
const SELECT_DROPDOWN_TYPE = "Select Elements + Dropdown"

/**
 * Formats a Select Elements + Dropdown response, e.g.
 * "Element 12 (Which state is highest?): Texas; Element 7 (Which is lowest?): Ohio".
 * Elements are named by visualId because that is what identifies them in the visualization. The
 * question text comes from the answer itself, since the instructor may have edited it after the
 * student answered. Anything that does not parse is returned as-is, so a malformed response is still
 * visible rather than silently dropped.
 * @param {string} response
 * @returns {string}
 */
function formatSelectDropdown(response) {
    let answers
    try {
        answers = JSON.parse(response)
    } catch {
        return response
    }
    if (!Array.isArray(answers)) return response
    return answers
        .map(answer => {
            const question = answer?.question ? ` (${answer.question})` : ""
            return `Element ${answer?.id}${question}: ${answer?.choice || "(no answer)"}`
        })
        .join("; ")
}

/**
 * @param {string} type question type name
 * @param {*} response stored response
 * @returns {*} readable response, or the original value for types without a formatter
 */
function formatResponse(type, response) {
    if (typeof response !== "string" || response === "") return response
    if (type === SELECT_DROPDOWN_TYPE) return formatSelectDropdown(response)
    return response
}

module.exports = { formatResponse, SELECT_DROPDOWN_TYPE }
