/**
 * @jest-environment jsdom
 */

// visualizer.js reads page elements as soon as it is imported, so it is
// replaced with the few pieces selectElements actually uses. The real
// VisualizationElement is used so selection rules (such as the maximum) apply.
jest.mock('../../../visualization/ui/public/src/visualizer.js', () => ({
    visualizationElement: null,
    visualContainer: globalThis.document.createElement('div'),
    wrapper: globalThis.document.createElement('div'),
    svgElement: null,
    debug: false,
    page: { mode: 'selectElements', addOption: jest.fn(), addTool: jest.fn() },
    autosave: { save: jest.fn() },
    screenToSVG: jest.fn((x, y) => ({ x, y })),
}))

const visualizer = require('../../../visualization/ui/public/src/visualizer.js')
const { VisualizationElement } = require('../../../visualization/ui/public/src/visualizationElement.js')
const { selectElements } = require('../../../visualization/ui/public/src/features/selectElements.js')
const { actionHistory } = require('../../../visualization/ui/public/src/features/actionHistory.js')

let decorated, selectAll, deselectAll

function bar(id) {
    return visualizer.visualizationElement.getElementById(id)
}

function click(id) {
    bar(id).dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function selected() {
    return visualizer.visualizationElement.getSelectedIds()
}

beforeAll(() => {
    document.body.innerHTML = '<input id="question-max" value="0">'
    document.body.appendChild(visualizer.visualContainer)

    decorated = selectElements({
        onPageLoadAsParticipant() {},
        onLoadSvg() {},
        onFirstLoadSvg() {},
        onChangeMode() {},
    })
    decorated.onPageLoadAsParticipant()
    const options = visualizer.page.addOption.mock.calls
    selectAll = options.find(call => call[0] === 'Select All Elements')[2]
    deselectAll = options.find(call => call[0] === 'Clear All Selections')[2]
})

beforeEach(() => {
    visualizer.visualContainer.innerHTML =
        '<svg><rect></rect><rect></rect><rect></rect></svg>'
    const svg = visualizer.visualContainer.firstElementChild
    visualizer.visualizationElement = new VisualizationElement(svg)
    visualizer.svgElement = svg
    visualizer.page.mode = 'selectElements'
    document.getElementById('question-max').value = '0'

    // Adds the delegated click listener; later calls are no-ops.
    decorated.onLoadSvg()
    actionHistory.clear()
})

test('each click can be undone and redone', () => {
    click('0')
    click('2')
    expect(selected()).toEqual(['0', '2'])

    actionHistory.undo()
    expect(selected()).toEqual(['0'])

    actionHistory.redo()
    expect(selected()).toEqual(['0', '2'])
})

test('undoing a deselect click selects the element again', () => {
    click('1')
    click('1')
    expect(selected()).toEqual([])

    actionHistory.undo()
    expect(selected()).toEqual(['1'])
})

test('select all and clear all are each a single undo step', () => {
    click('0')

    selectAll()
    expect(selected()).toEqual(['0', '1', '2'])

    deselectAll()
    expect(selected()).toEqual([])

    actionHistory.undo()
    expect(selected()).toEqual(['0', '1', '2'])

    actionHistory.undo()
    expect(selected()).toEqual(['0'])
})

test('clicks blocked by the maximum add no history', () => {
    document.getElementById('question-max').value = '1'

    click('0')
    click('1')

    expect(selected()).toEqual(['0'])
    expect(actionHistory.commands).toHaveLength(1)
})

test('clicks in other modes add no history', () => {
    visualizer.page.mode = 'regionBox'

    click('0')

    expect(selected()).toEqual([])
    expect(actionHistory.canUndo).toBe(false)
})
