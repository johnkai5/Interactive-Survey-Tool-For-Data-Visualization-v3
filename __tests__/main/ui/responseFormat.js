const { formatResponse, SELECT_DROPDOWN_TYPE } = require('../../../main/ui/responseFormat')
const questionTypes = require('../../../main/ui/public/src/questionTypes.mjs').default

describe('formatResponse', () => {
    test('uses the type name registered in questionTypes.mjs', () => {
        expect(questionTypes.map(type => type.name)).toContain(SELECT_DROPDOWN_TYPE)
    })

    test('lists each element with its question and answer for Select Elements + Dropdown', () => {
        const response = JSON.stringify([
            { id: "12", question: "Which state is highest?", choice: "Texas" },
            { id: "7", question: "Which is lowest?", choice: "Ohio" }
        ])
        expect(formatResponse(SELECT_DROPDOWN_TYPE, response))
            .toBe("Element 12 (Which state is highest?): Texas; Element 7 (Which is lowest?): Ohio")
    })

    test('leaves out a missing question', () => {
        const response = JSON.stringify([{ id: "12", choice: "Outlier" }])
        expect(formatResponse(SELECT_DROPDOWN_TYPE, response)).toBe("Element 12: Outlier")
    })

    test('marks an element saved without a choice', () => {
        const response = JSON.stringify([{ id: "3", choice: "" }])
        expect(formatResponse(SELECT_DROPDOWN_TYPE, response)).toBe("Element 3: (no answer)")
    })

    test.each([
        ["text that is not JSON", "not json"],
        ["JSON that is not a list", JSON.stringify({ id: "1" })]
    ])('returns %s unchanged', (_, response) => {
        expect(formatResponse(SELECT_DROPDOWN_TYPE, response)).toBe(response)
    })

    test.each(["", undefined, null])('returns an empty response (%p) unchanged', (response) => {
        expect(formatResponse(SELECT_DROPDOWN_TYPE, response)).toBe(response)
    })

    test('leaves other question types unchanged', () => {
        expect(formatResponse("Multiple Choice", "A|B")).toBe("A|B")
        expect(formatResponse("Select Region", '{"type":"rect"}')).toBe('{"type":"rect"}')
    })
})
