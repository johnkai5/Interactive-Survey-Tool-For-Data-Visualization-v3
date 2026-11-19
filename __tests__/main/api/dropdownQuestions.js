const { stripDropdownQuestions, leavesDropdownType, SELECT_DROPDOWN_TYPE } = require('../../../main/api/lib/dropdownQuestions')

describe('stripDropdownQuestions', () => {
    test('removes the question and choices from every element and keeps everything else', () => {
        const svg = '<svg><rect class="custom" visualId="3" dropdown-question="Apples?" dropdown-choices="[&quot;Yes&quot;,&quot;No&quot;]"/>' +
            '<path visualId="4" dropdown-question="Say &quot;hi&quot;" dropdown-choices="[&quot;A&quot;]" d="M0 0"/></svg>'

        expect(stripDropdownQuestions(svg)).toBe('<svg><rect class="custom" visualId="3"/><path visualId="4" d="M0 0"/></svg>')
    })

    test('leaves an SVG without questions unchanged', () => {
        const svg = '<svg><rect visualId="3" label="dropdown-question"/></svg>'
        expect(stripDropdownQuestions(svg)).toBe(svg)
    })

    test('passes through a missing SVG', () => {
        expect(stripDropdownQuestions(undefined)).toBeUndefined()
    })
})

describe('leavesDropdownType', () => {
    test('is true when a dropdown question changes to another type', () => {
        expect(leavesDropdownType(SELECT_DROPDOWN_TYPE, "Select Elements")).toBe(true)
    })

    test.each([
        ["the type stays the same", SELECT_DROPDOWN_TYPE, SELECT_DROPDOWN_TYPE],
        ["the update does not set a type", SELECT_DROPDOWN_TYPE, undefined],
        ["the question was another type", "Select Elements", "Radio Choice"]
    ])('is false when %s', (_, oldType, newType) => {
        expect(leavesDropdownType(oldType, newType)).toBe(false)
    })
})
