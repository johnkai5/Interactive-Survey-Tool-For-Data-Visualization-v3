/**
 * @jest-environment jsdom
 */
const {
    readElementQuestion,
    writeElementQuestion,
    clearElementQuestion,
    questionElements,
    collectAnswers,
    restoreAnswers,
    placeCard,
    QUESTION_ATTRIBUTE,
    CHOICES_ATTRIBUTE
} = require('../../../visualization/ui/public/src/features/dropdownQuestionData.js')

function element(visualId, question, choices) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    el.setAttribute("visualId", visualId)
    if (question !== undefined) el.setAttribute(QUESTION_ATTRIBUTE, question)
    if (choices !== undefined) el.setAttribute(CHOICES_ATTRIBUTE, typeof choices === "string" ? choices : JSON.stringify(choices))
    return el
}

describe('readElementQuestion', () => {
    test('reads the question and its answers', () => {
        expect(readElementQuestion(element("1", "Which?", ["A", "B"]))).toEqual({ question: "Which?", choices: ["A", "B"] })
    })

    test('drops blank and non-text answers', () => {
        expect(readElementQuestion(element("1", "Which?", ["A", " ", 3, null]))).toEqual({ question: "Which?", choices: ["A"] })
    })

    test.each([
        ["no question", element("1")],
        ["an empty question", element("1", "", ["A"])],
        ["answers that are not JSON", element("1", "Which?", "A|B")],
        ["answers that are not a list", element("1", "Which?", { a: 1 })],
        ["no usable answers", element("1", "Which?", ["", "  "])],
        ["a missing element", null]
    ])('returns null for %s', (_, el) => {
        expect(readElementQuestion(el)).toBeNull()
    })
})

describe('writeElementQuestion', () => {
    test('saves trimmed text and drops blank answers', () => {
        const el = element("1")

        expect(writeElementQuestion(el, "  Which?  ", [" A ", "", "B"])).toBe(true)
        expect(readElementQuestion(el)).toEqual({ question: "Which?", choices: ["A", "B"] })
    })

    test('keeps answers that contain separators and quotes', () => {
        const el = element("1")
        writeElementQuestion(el, "Pick", ['A | B', 'say "hi"'])

        expect(readElementQuestion(el).choices).toEqual(['A | B', 'say "hi"'])
    })

    test.each([
        ["no question text", "  ", ["A"]],
        ["no answers", "Which?", ["", " "]],
        ["missing values", undefined, undefined]
    ])('saves nothing and keeps the existing question when given %s', (_, question, choices) => {
        const el = element("1", "Old?", ["Old"])

        expect(writeElementQuestion(el, question, choices)).toBe(false)
        expect(readElementQuestion(el)).toEqual({ question: "Old?", choices: ["Old"] })
    })
})

test('clearElementQuestion removes both attributes', () => {
    const el = element("1", "Which?", ["A"])
    clearElementQuestion(el)

    expect(readElementQuestion(el)).toBeNull()
    expect(el.hasAttribute(CHOICES_ATTRIBUTE)).toBe(false)
})

test('questionElements keeps only elements with a usable question, in order', () => {
    const a = element("1", "Q1", ["A"])
    const b = element("2")
    const c = element("3", "Q3", "broken")
    const d = element("4", "Q4", ["D"])

    expect(questionElements([a, b, c, d])).toEqual([a, d])
})

describe('collectAnswers', () => {
    const elements = () => [element("1", "Q1", ["A", "B"]), element("2"), element("3", "Q3", ["C"])]

    test('returns each answer with the question it answered', () => {
        const chosen = new Map([["1", "B"], ["3", "C"]])

        expect(collectAnswers(elements(), chosen)).toEqual({
            answers: [{ id: "1", question: "Q1", choice: "B" }, { id: "3", question: "Q3", choice: "C" }],
            unanswered: 0
        })
    })

    test('counts questions without an answer', () => {
        expect(collectAnswers(elements(), new Map([["1", "A"]])).unanswered).toBe(1)
        expect(collectAnswers(elements(), new Map()).unanswered).toBe(2)
    })

    test('counts an answer that is no longer offered as unanswered', () => {
        const result = collectAnswers(elements(), new Map([["1", "Z"], ["3", "C"]]))

        expect(result.answers).toEqual([{ id: "3", question: "Q3", choice: "C" }])
        expect(result.unanswered).toBe(1)
    })

    test('ignores answers for elements without a question', () => {
        expect(collectAnswers(elements(), new Map([["2", "A"]])).answers).toEqual([])
    })
})

describe('restoreAnswers', () => {
    const elements = () => [element("1", "Q1", ["A", "B"]), element("2"), element("3", "Q3", ["C"])]

    test('restores saved answers by element id', () => {
        const saved = [{ id: "1", question: "Q1", choice: "B" }, { id: 3, question: "Q3", choice: "C" }]

        expect(restoreAnswers(saved, elements())).toEqual(new Map([["1", "B"], ["3", "C"]]))
    })

    test('drops answers whose element or choice no longer exists', () => {
        const saved = [{ id: "1", choice: "Z" }, { id: "2", choice: "A" }, { id: "9", choice: "A" }, null, { choice: "A" }]

        expect(restoreAnswers(saved, elements()).size).toBe(0)
    })

    test.each([undefined, { id: "1" }])('treats %p as no saved answers', (saved) => {
        expect(restoreAnswers(saved, elements()).size).toBe(0)
    })
})

describe('placeCard', () => {
    const card = { width: 100, height: 80 }
    const frame = { width: 500, height: 400 }

    test('goes to the right of the element when there is room', () => {
        expect(placeCard({ left: 50, right: 70, top: 30 }, card, frame)).toEqual({ left: 78, top: 30 })
    })

    test('flips to the left near the right edge', () => {
        expect(placeCard({ left: 450, right: 470, top: 30 }, card, frame)).toEqual({ left: 342, top: 30 })
    })

    test('stays inside the frame vertically', () => {
        expect(placeCard({ left: 50, right: 70, top: 390 }, card, frame).top).toBe(312)
        expect(placeCard({ left: 50, right: 70, top: -40 }, card, frame).top).toBe(8)
    })

    test('stays inside the frame when neither side has room', () => {
        expect(placeCard({ left: 20, right: 480, top: 10 }, card, frame).left).toBe(8)
    })
})
