/**
 * @jest-environment jsdom
 */

// visualizer.js reads page elements as soon as it is imported, so it is
// replaced with the few pieces regionSelect actually uses.
jest.mock('../../../visualization/ui/public/src/visualizer.js', () => ({
    wrapper: globalThis.document.createElement('div'),
    svgElement: null,
    page: { mode: '' },
    staticvis: false,
    debug: false,
    screenToSVG: jest.fn((x, y) => ({ x, y })),
}))

const visualizer = require('../../../visualization/ui/public/src/visualizer.js')
const { regionSelect } = require('../../../visualization/ui/public/src/features/regionSelect.js')
const { actionHistory } = require('../../../visualization/ui/public/src/features/actionHistory.js')

let decorated, shape, outside

function setMode(mode) {
    visualizer.page.mode = mode
    decorated.onChangeMode()
}

function pointerDown(x, y, target = shape) {
    visualizer.wrapper.onpointerdown({
        target,
        clientX: x,
        clientY: y,
        preventDefault() {},
    })
}

function pointer(type, x, y) {
    document.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }))
}

function drag(points) {
    const [first, ...rest] = points
    pointerDown(...first)
    for (const point of rest) pointer('pointermove', ...point)
    pointer('pointerup', ...points[points.length - 1])
}

function rect(x, y, width, height) {
    return { type: 'rect', x, y, width, height }
}

beforeAll(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    svg.appendChild(shape)
    outside = document.createElement('div')
    document.body.append(svg, outside)
    visualizer.svgElement = svg

    // regionSelect adds document listeners each time it runs, so it only runs once here.
    decorated = regionSelect({ onChangeMode() {}, onFirstLoadSvg() {} })
})

beforeEach(() => {
    setMode('regionBox')
    decorated.loadRegion(null)
})

describe('box regions', () => {
    test('drawing a box can be undone and redone', () => {
        drag([[10, 10], [60, 40]])
        expect(decorated.getRegionAnswer()).toEqual(rect(10, 10, 50, 30))

        actionHistory.undo()
        expect(decorated.getRegionAnswer()).toBeNull()

        actionHistory.redo()
        expect(decorated.getRegionAnswer()).toEqual(rect(10, 10, 50, 30))
    })

    test('undoing a second box brings back the first', () => {
        drag([[0, 0], [20, 20]])
        drag([[100, 100], [150, 120]])

        actionHistory.undo()

        expect(decorated.getRegionAnswer()).toEqual(rect(0, 0, 20, 20))
    })

    test('a click without a drag on an empty visual records nothing', () => {
        drag([[5, 5], [5, 5]])

        expect(decorated.getRegionAnswer()).toBeNull()
        expect(actionHistory.canUndo).toBe(false)
    })

    test('pressing outside the SVG does not start a drawing', () => {
        pointerDown(10, 10, outside)
        pointer('pointermove', 60, 60)
        pointer('pointerup', 60, 60)

        expect(decorated.getRegionAnswer()).toBeNull()
        expect(actionHistory.canUndo).toBe(false)
    })
})

describe('lasso regions', () => {
    test('drawing a lasso can be undone', () => {
        setMode('regionLasso')

        drag([[0, 0], [50, 0], [50, 50]])
        expect(decorated.getRegionAnswer()).toEqual({
            type: 'polygon',
            closed: true,
            points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }],
        })

        actionHistory.undo()
        expect(decorated.getRegionAnswer()).toBeNull()
    })
})

describe('interrupted drawings', () => {
    beforeEach(() => {
        drag([[0, 0], [20, 20]])
    })

    test('pointercancel puts back the region from before the drawing', () => {
        pointerDown(100, 100)
        pointer('pointermove', 150, 150)
        pointer('pointercancel', 150, 150)

        expect(decorated.getRegionAnswer()).toEqual(rect(0, 0, 20, 20))
        expect(actionHistory.commands).toHaveLength(1)
    })

    test('changing mode mid-drawing puts back the previous region', () => {
        pointerDown(100, 100)
        pointer('pointermove', 150, 150)

        setMode('selectElements')

        expect(decorated.getRegionAnswer()).toEqual(rect(0, 0, 20, 20))
    })

    test('reading the answer mid-drawing finishes and records the drawing', () => {
        pointerDown(100, 100)
        pointer('pointermove', 150, 130)

        expect(decorated.getRegionAnswer()).toEqual(rect(100, 100, 50, 30))

        actionHistory.undo()
        expect(decorated.getRegionAnswer()).toEqual(rect(0, 0, 20, 20))
    })
})

describe('clearRegion and loadRegion', () => {
    test('clearing a region can be undone', () => {
        drag([[0, 0], [20, 20]])

        decorated.clearRegion()
        expect(decorated.getRegionAnswer()).toBeNull()

        actionHistory.undo()
        expect(decorated.getRegionAnswer()).toEqual(rect(0, 0, 20, 20))
    })

    test('loading a saved region sets the answer and resets the history', () => {
        drag([[0, 0], [20, 20]])

        decorated.loadRegion(rect(5, 5, 10, 10))

        expect(decorated.getRegionAnswer()).toEqual(rect(5, 5, 10, 10))
        expect(actionHistory.canUndo).toBe(false)
        expect(actionHistory.canRedo).toBe(false)
    })
})
