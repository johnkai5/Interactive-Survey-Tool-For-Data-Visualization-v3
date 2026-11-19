/**
 * @jest-environment jsdom
 */
const {
    SLOW_SAVE_THRESHOLD_MS,
    createSaveProgressGate,
    formatSavedStatus,
    setProgressVisible,
    setSavingIndicator
} = require('../../../visualization/ui/public/src/saveIndicator.js')

beforeEach(() => {
    jest.useFakeTimers()
})

afterEach(() => {
    jest.useRealTimers()
})

describe('createSaveProgressGate', () => {
    test('shows the bar right away when the previous save was slow', () => {
        const show = jest.fn()
        const gate = createSaveProgressGate({ show, lastDurationMs: SLOW_SAVE_THRESHOLD_MS + 1 })

        expect(show).toHaveBeenCalledTimes(1)
        expect(gate.isShown()).toBe(true)
    })

    test('never shows the bar for a fast save after a fast save', () => {
        const show = jest.fn()
        const gate = createSaveProgressGate({ show, lastDurationMs: 200 })

        jest.advanceTimersByTime(SLOW_SAVE_THRESHOLD_MS - 1)
        gate.settle()
        jest.advanceTimersByTime(SLOW_SAVE_THRESHOLD_MS)

        expect(show).not.toHaveBeenCalled()
        expect(gate.isShown()).toBe(false)
    })

    test('treats a save exactly at the threshold as fast', () => {
        const show = jest.fn()
        createSaveProgressGate({ show, lastDurationMs: SLOW_SAVE_THRESHOLD_MS })

        expect(show).not.toHaveBeenCalled()
    })

    test('never shows the bar for a fast first save', () => {
        const show = jest.fn()
        const gate = createSaveProgressGate({ show })

        gate.settle()
        jest.runAllTimers()

        expect(show).not.toHaveBeenCalled()
    })

    test('shows the bar once at the threshold when the current save runs long', () => {
        const show = jest.fn()
        const gate = createSaveProgressGate({ show, lastDurationMs: 200 })

        jest.advanceTimersByTime(SLOW_SAVE_THRESHOLD_MS - 1)
        expect(show).not.toHaveBeenCalled()

        jest.advanceTimersByTime(1)
        expect(show).toHaveBeenCalledTimes(1)
        expect(gate.isShown()).toBe(true)
    })

    test('settling after the bar is shown is safe and does not show it again', () => {
        const show = jest.fn()
        const gate = createSaveProgressGate({ show })

        jest.advanceTimersByTime(SLOW_SAVE_THRESHOLD_MS)
        expect(() => {
            gate.settle()
            gate.settle()
        }).not.toThrow()
        jest.runAllTimers()

        expect(show).toHaveBeenCalledTimes(1)
    })

    test('uses a custom threshold and injected timers', () => {
        const show = jest.fn()
        const schedule = jest.fn(() => 42)
        const cancel = jest.fn()
        const gate = createSaveProgressGate({ show, thresholdMs: 500, lastDurationMs: 400, schedule, cancel })

        expect(schedule).toHaveBeenCalledWith(expect.any(Function), 500)
        gate.settle()
        expect(cancel).toHaveBeenCalledWith(42)
        expect(show).not.toHaveBeenCalled()
    })

    test('ignores a non-numeric previous duration', () => {
        const show = jest.fn()
        createSaveProgressGate({ show, lastDurationMs: '5000' })

        expect(show).not.toHaveBeenCalled()
    })
})

describe('setSavingIndicator', () => {
    test('shows the hourglass while saving and hides it when done', () => {
        document.body.innerHTML = '<span id="save-indicator" hidden>⏳ </span>'
        const indicator = document.getElementById('save-indicator')

        setSavingIndicator(indicator, true)
        expect(indicator.hidden).toBe(false)

        setSavingIndicator(indicator, false)
        expect(indicator.hidden).toBe(true)
    })

    test('does nothing when the hourglass element is missing', () => {
        expect(() => setSavingIndicator(null, true)).not.toThrow()
    })
})

describe('setProgressVisible', () => {
    let progress, status

    beforeEach(() => {
        document.body.innerHTML = `
            <small id="save-status"></small>
            <div id="upload-progress-container" hidden></div>
        `
        progress = document.getElementById('upload-progress-container')
        status = document.getElementById('save-status')
    })

    test('hides the save status while the progress bar is shown', () => {
        setProgressVisible({ progress, status }, true)
        expect(progress.hidden).toBe(false)
        expect(status.hidden).toBe(true)
    })

    test('brings the save status back when the progress bar is hidden', () => {
        setProgressVisible({ progress, status }, true)
        setProgressVisible({ progress, status }, false)
        expect(progress.hidden).toBe(true)
        expect(status.hidden).toBe(false)
    })

    test('does nothing for missing elements', () => {
        expect(() => setProgressVisible({ progress: null, status: null }, true)).not.toThrow()
    })
})

describe('formatSavedStatus', () => {
    test('includes the time the save finished', () => {
        const date = new Date(2026, 10, 10, 14, 41, 5)
        expect(formatSavedStatus(date, 'en-US')).toBe('Changes saved at 2:41 PM')
    })

    test('changes between saves made in different minutes', () => {
        const first = formatSavedStatus(new Date(2026, 10, 10, 9, 5), 'en-US')
        const second = formatSavedStatus(new Date(2026, 10, 10, 9, 6), 'en-US')
        expect(first).not.toBe(second)
    })
})
