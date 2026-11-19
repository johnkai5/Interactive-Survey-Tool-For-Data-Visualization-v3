// The visual editor only lets the page embedding it, on the main app's origin, change the editor.
const { originOf, isFromTrustedParent } = require('../../../visualization/ui/public/src/parentMessages.js')

const MAIN_ORIGIN = originOf("http://localhost:5000/")

// Stand-ins for the iframe's window and the question editor page that embeds it
const parent = {}
const self = { parent }

test('accepts the embedding window on the main app origin', () => {
    expect(isFromTrustedParent({ source: parent, origin: "http://localhost:5000" }, self, MAIN_ORIGIN)).toBe(true)
})

test('rejects another origin or another window', () => {
    expect(isFromTrustedParent({ source: parent, origin: "http://evil.example" }, self, MAIN_ORIGIN)).toBe(false)
    expect(isFromTrustedParent({ source: {}, origin: MAIN_ORIGIN }, self, MAIN_ORIGIN)).toBe(false)
})

test('rejects everything when MAIN_UI_URL is not configured', () => {
    expect(isFromTrustedParent({ source: parent, origin: MAIN_ORIGIN }, self, originOf(undefined))).toBe(false)
})
