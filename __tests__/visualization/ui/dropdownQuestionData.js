/**
 * @jest-environment jsdom
 */
const {
    readElementQuestion,
    writeElementQuestion,
    clearElementQuestion,
    clearAllElementQuestions,
    questionElements,
    collectAnswers,
    restoreAnswers,
    placeCard,
    anchorCard,
    followCard,
    isDrag,
    nextAnswerStep,
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

test('clearAllElementQuestions removes full and partial questions and counts them', () => {
    const full = element("1", "Q1", ["A"])
    const partial = element("2", undefined, ["B"])
    const none = element("3")

    expect(clearAllElementQuestions([full, partial, none])).toBe(2)
    expect([full, partial].some(el => el.hasAttribute(QUESTION_ATTRIBUTE) || el.hasAttribute(CHOICES_ATTRIBUTE))).toBe(false)
    expect(clearAllElementQuestions([full, partial, none])).toBe(0)
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

describe('anchorCard and followCard', () => {
    test('a popup on the right follows the element when the visual pans', () => {
        const anchor = anchorCard({ left: 50, right: 70, top: 30 }, { left: 78, top: 30 })

        expect(followCard({ left: 150, right: 170, top: 10 }, anchor)).toEqual({ left: 178, top: 10 })
    })

    test('a popup on the left keeps its offset from the left edge when zooming widens the element', () => {
        const anchor = anchorCard({ left: 450, right: 470, top: 30 }, { left: 342, top: 30 })

        expect(followCard({ left: 400, right: 520, top: 30 }, anchor)).toEqual({ left: 292, top: 30 })
    })

    test('keeps the vertical offset of a popup that was nudged into the frame', () => {
        const anchor = anchorCard({ left: 50, right: 70, top: 390 }, { left: 78, top: 312 })

        expect(followCard({ left: 50, right: 70, top: 200 }, anchor).top).toBe(122)
    })

    test('follows the element off-screen instead of staying inside the frame', () => {
        const anchor = anchorCard({ left: 50, right: 70, top: 30 }, { left: 78, top: 30 })

        expect(followCard({ left: -500, right: -480, top: -300 }, anchor)).toEqual({ left: -472, top: -300 })
    })
})

describe('isDrag', () => {
    test('a click that barely moves is not a drag', () => {
        expect(isDrag({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false)
    })

    test('moving further than the threshold is a drag', () => {
        expect(isDrag({ x: 10, y: 10 }, { x: 30, y: 10 })).toBe(true)
    })

    test('a click with no recorded press is not a drag', () => {
        expect(isDrag(null, { x: 30, y: 10 })).toBe(false)
    })
})

describe('nextAnswerStep', () => {
    test('moves from the question to the first answer', () => {
        expect(nextAnswerStep(-1, ["A", "B"])).toBe(0)
    })

    test('moves to the next answer box', () => {
        expect(nextAnswerStep(0, ["A", "B"])).toBe(1)
    })

    test('adds an answer after a filled-in last box', () => {
        expect(nextAnswerStep(1, ["A", "B"])).toBe("add")
    })

    test('adds an answer from the question when there are no answer boxes', () => {
        expect(nextAnswerStep(-1, [])).toBe("add")
    })

    test('stays in a blank last box instead of adding another', () => {
        expect(nextAnswerStep(1, ["A", "  "])).toBe(1)
    })
})
