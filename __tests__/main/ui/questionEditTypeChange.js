/**
 * @jest-environment jsdom
 */
// Covers what the question editor page tells the visual editor when the question type changes.
// Leaving Select Elements + Dropdown must not delete the element questions before the user saves.
const { SELECT_DROPDOWN_TYPE } = require('../../../main/ui/public/src/questionTypes.mjs')

const VISUAL_ORIGIN = "http://localhost:8000"
const OTHER_TYPE = "Multiple Choice"

let postMessage

// Mirrors the parts of editquestion.handlebars that questionEdit.js reads
function renderPage(initialType) {
    document.body.innerHTML = `
        <form id="question-form">
            <textarea id="text"></textarea>
            <select id="type">
                <option value="${SELECT_DROPDOWN_TYPE}">${SELECT_DROPDOWN_TYPE}</option>
                <option value="${OTHER_TYPE}">${OTHER_TYPE}</option>
            </select>
            <small id="type-description"></small>
            <section id="multiple-choice-section" hidden>
                <button id="add-choice-btn" type="button"></button>
                <input id="choice-input">
                <ul id="choice-list"></ul>
                <textarea id="choices"></textarea>
            </section>
            <div id="required-line"><input type="checkbox" id="required"></div>
            <input type="checkbox" id="allowComment">
            <div id="commentDiv"><input id="commentText"></div>
            <div id="min-line"><label id="min-label"></label><input type="number" id="min" value="0"></div>
            <div id="max-line"><label id="max-label"></label><input type="number" id="max" value="0"></div>
            <select id="visualizationId"><option value=""></option></select>
            <button id="save-question-button"></button>
        </form>
        <iframe id="displayedImage" src="${VISUAL_ORIGIN}/1?editor=true"></iframe>
    `
    document.getElementById("type").value = initialType
    postMessage = jest.spyOn(document.getElementById("displayedImage").contentWindow, "postMessage").mockImplementation(() => {})

    jest.isolateModules(() => require('../../../main/ui/public/src/questionEdit.js'))
    document.dispatchEvent(new Event("DOMContentLoaded"))
}

function changeType(type) {
    const select = document.getElementById("type")
    select.value = type
    select.dispatchEvent(new Event("change"))
}

function sentMessages() {
    return postMessage.mock.calls.map(([message]) => message)
}

test('leaving Select Elements + Dropdown only hides the tool', () => {
    renderPage(SELECT_DROPDOWN_TYPE)
    postMessage.mockClear()

    changeType(OTHER_TYPE)

    expect(postMessage).toHaveBeenCalledWith({ hideDropdownEditor: true }, VISUAL_ORIGIN)
    expect(sentMessages()).not.toContainEqual(expect.objectContaining({ clearDropdownQuestions: expect.anything() }))
})

test('switching back to Select Elements + Dropdown reopens the tool', () => {
    renderPage(SELECT_DROPDOWN_TYPE)
    changeType(OTHER_TYPE)
    postMessage.mockClear()

    changeType(SELECT_DROPDOWN_TYPE)

    expect(postMessage).toHaveBeenCalledWith({ setEditorMode: "dropdownEditor" }, VISUAL_ORIGIN)
    expect(sentMessages()).not.toContainEqual({ hideDropdownEditor: true })
})
