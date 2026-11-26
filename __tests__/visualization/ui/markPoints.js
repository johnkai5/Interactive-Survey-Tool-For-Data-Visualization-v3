/**
 * @jest-environment jsdom
 */

// visualizer.js reads page elements as soon as it is imported, so it is
// replaced with the few pieces markPoints actually uses.
jest.mock('../../../visualization/ui/public/src/visualizer.js', () => ({
    visualizationElement: { svg: null },
    visualContainer: globalThis.document.createElement('div'),
    wrapper: globalThis.document.createElement('div'),
    svgElement: null,
    debug: false,
    page: { mode: 'markPoints', addOption: jest.fn() },
    screenToSVG: jest.fn((x, y) => ({ x, y })),
}))

const visualizer = require('../../../visualization/ui/public/src/visualizer.js')
const { markPoints } = require('../../../visualization/ui/public/src/features/markPoints.js')
const { actionHistory } = require('../../../visualization/ui/public/src/features/actionHistory.js')

let clearAllMarks

function click(x, y) {
    visualizer.visualContainer.dispatchEvent(
        new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })
    )
}

function marks() {
    return Array.from(
        visualizer.visualizationElement.svg.querySelectorAll('.mark-container .mark'),
        mark => [mark.getAttribute('cx'), mark.getAttribute('cy')]
    )
}

beforeAll(() => {
    document.body.innerHTML = '<input id="question-max" value="0">'
    document.body.appendChild(visualizer.visualContainer)

    // Listeners are added once per onFirstLoadSvg, so it only runs once here.
    markPoints({ onFirstLoadSvg() {} }).onFirstLoadSvg()
    clearAllMarks = visualizer.page.addOption.mock.calls[0][2]
})

beforeEach(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    visualizer.visualContainer.replaceChildren(svg)
    visualizer.visualizationElement.svg = svg
    visualizer.page.mode = 'markPoints'
    document.getElementById('question-max').value = '0'
    actionHistory.clear()
})

test('each mark can be undone and redone', () => {
    click(10, 20)
    click(30, 40)
    expect(marks()).toEqual([['10', '20'], ['30', '40']])

    actionHistory.undo()
    expect(marks()).toEqual([['10', '20']])

    actionHistory.undo()
    expect(marks()).toEqual([])

    actionHistory.redo()
    actionHistory.redo()
    expect(marks()).toEqual([['10', '20'], ['30', '40']])
})

test('clearing all marks is one action that undo brings back', () => {
    click(1, 2)
    click(3, 4)

    clearAllMarks()
    expect(marks()).toEqual([])

    actionHistory.undo()
    expect(marks()).toEqual([['1', '2'], ['3', '4']])
})

test('clearing when there are no marks adds nothing to undo', () => {
    clearAllMarks()

    expect(actionHistory.canUndo).toBe(false)
})

test('clicks past the maximum add no mark and no history', () => {
    document.getElementById('question-max').value = '1'

    click(1, 1)
    click(2, 2)

    expect(marks()).toEqual([['1', '1']])
    expect(actionHistory.commands).toHaveLength(1)
})

test('clicks in another mode add no mark', () => {
    visualizer.page.mode = 'selectElements'

    click(1, 1)

    expect(marks()).toEqual([])
    expect(actionHistory.canUndo).toBe(false)
})
