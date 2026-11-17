/**
 * @jest-environment jsdom
 */
// Covers the "Select Elements + Dropdown" entry in questionTypes.mjs as the take-survey page uses it.
// The answers live in the visualization iframe, so these tests stand in for the iframe's replies.
const questionTypes = require('../../../main/ui/public/src/questionTypes.mjs').default

const TYPE_NAME = "Select Elements + Dropdown"
const VISUAL_URL = "http://localhost:8000"
const typeInfo = questionTypes.find(type => type.name === TYPE_NAME)

let postMessage

// Mirrors the parts of takeSurveyPage.handlebars this type reads
function renderPage(savedResponse = "") {
    document.body.innerHTML = `
        <meta id="savedResponse">
        <meta id="visualURL" url="${VISUAL_URL}">
        <iframe id="displayedImage"></iframe>
    `
    document.getElementById("savedResponse").setAttribute("response", savedResponse)
    postMessage = jest.spyOn(document.getElementById("displayedImage").contentWindow, "postMessage").mockImplementation(() => {})
}

// jsdom's postMessage does not set origin, so dispatch the reply the way a browser delivers it
function reply(data, origin = VISUAL_URL) {
    window.dispatchEvent(new MessageEvent("message", { origin, data }))
}

function check() {
    const onFailure = jest.fn()
    const onSuccess = jest.fn()
    typeInfo.checkRequirement(0, 0, null, onFailure, onSuccess)
    return { onFailure, onSuccess }
}

beforeEach(() => renderPage())

test('is a visual question with no shared choices or limits', () => {
    expect(typeInfo).toMatchObject({
        hasChoices: false,
        hasMinMax: false,
        hasRequired: false,
        requiresVisual: true,
        visualModeLabel: "selectDropdown"
    })
})

test('prompt tells the student to answer every highlighted element', () => {
    expect(typeInfo.getPromptString(0, 0)).toBe("Click each highlighted element on the visual to the left and answer its question")
})

describe('checkRequirement', () => {
    test('asks the visual for the answers', () => {
        check()

        expect(postMessage).toHaveBeenCalledWith("dropdownAnswers", VISUAL_URL)
    })

    test('passes when nothing is unanswered', () => {
        const { onFailure, onSuccess } = check()
        reply({ type: "dropdownAnswers", answers: [{ id: "1", question: "Q", choice: "A" }], unanswered: 0 })

        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onFailure).not.toHaveBeenCalled()
    })

    test('fails while an element is unanswered', () => {
        const { onFailure, onSuccess } = check()
        reply({ type: "dropdownAnswers", answers: [], unanswered: 2 })

        expect(onFailure).toHaveBeenCalledWith("Answer the question on every highlighted element")
        expect(onSuccess).not.toHaveBeenCalled()
    })

    test('waits past other messages and messages from other origins', () => {
        const { onFailure, onSuccess } = check()
        reply({ type: "count", count: 1 })
        reply({ type: "dropdownAnswers", answers: [], unanswered: 3 }, "http://evil.example")
        expect(onSuccess).not.toHaveBeenCalled()
        expect(onFailure).not.toHaveBeenCalled()

        reply({ type: "dropdownAnswers", answers: [], unanswered: 0 })
        expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    test('stops listening after the reply', () => {
        const { onSuccess } = check()
        reply({ type: "dropdownAnswers", answers: [], unanswered: 0 })
        reply({ type: "dropdownAnswers", answers: [], unanswered: 0 })

        expect(onSuccess).toHaveBeenCalledTimes(1)
    })
})

describe('getResponse', () => {
    test('saves the answers as JSON', () => {
        const onGet = jest.fn()
        typeInfo.getResponse(onGet)
        const answers = [{ id: "12", question: "Which?", choice: "Texas" }]
        reply({ type: "dropdownAnswers", answers, unanswered: 1 })

        expect(JSON.parse(onGet.mock.calls[0][0])).toEqual(answers)
    })

    test('saves no answers as an empty response', () => {
        const onGet = jest.fn()
        typeInfo.getResponse(onGet)
        reply({ type: "dropdownAnswers", answers: [], unanswered: 0 })

        expect(onGet).toHaveBeenCalledWith("")
    })
})

describe('onVisualLoaded', () => {
    test('sends the saved answers to the visual', () => {
        const answers = [{ id: "12", question: "Which?", choice: "Texas" }]
        renderPage(JSON.stringify(answers))

        typeInfo.onVisualLoaded()

        expect(postMessage).toHaveBeenCalledWith({ loadDropdownAnswers: answers }, VISUAL_URL)
    })

    test.each([
        ["an empty draft", ""],
        ["JSON that is not a list", JSON.stringify({ id: "1" })]
    ])('sends no answers for %s', (_, saved) => {
        renderPage(saved)

        typeInfo.onVisualLoaded()

        expect(postMessage).toHaveBeenCalledWith({ loadDropdownAnswers: [] }, VISUAL_URL)
    })
})
