/*
*   Helpers for the save progress bar and save status in the editor header.
**/

// Saves faster than this feel instant, so a progress bar would only flicker.
export const SLOW_SAVE_THRESHOLD_MS = 1000

/**
 * Shows the progress bar only for slow saves: right away if the previous save
 * was slow, otherwise after the threshold unless the save settles first.
 *
 * @param {Object} options
 * @param {Function} options.show called at most once to reveal the progress bar
 * @param {number|null} [options.lastDurationMs] duration of the previous successful save
 * @param {number} [options.thresholdMs]
 * @param {Function} [options.schedule] timer function, replaceable in tests
 * @param {Function} [options.cancel] timer cancel function, replaceable in tests
 * @returns {{settle: Function, isShown: Function}}
 */
export function createSaveProgressGate({
    show,
    lastDurationMs = null,
    thresholdMs = SLOW_SAVE_THRESHOLD_MS,
    schedule = (callback, ms) => setTimeout(callback, ms),
    cancel = (id) => clearTimeout(id)
}) {
    let shown = false
    let settled = false
    let timer = null

    const reveal = () => {
        timer = null
        if (shown || settled) return
        shown = true
        show()
    }

    if (typeof lastDurationMs === "number" && lastDurationMs > thresholdMs) {
        reveal()
    } else {
        timer = schedule(reveal, thresholdMs)
    }

    return {
        settle() {
            settled = true
            if (timer !== null) {
                cancel(timer)
                timer = null
            }
        },
        isShown() {
            return shown
        }
    }
}

/**
 * Shows or hides the hourglass before the save status text.
 *
 * @param {Element|null} indicator the hourglass element; missing is a no-op
 * @param {boolean} saving
 */
export function setSavingIndicator(indicator, saving) {
    if (!indicator) return
    indicator.hidden = !saving
}

/**
 * Shows either the progress bar or the save status, never both.
 *
 * @param {Object} elements
 * @param {Element|null} elements.progress the progress bar container
 * @param {Element|null} elements.status the save status (hourglass and text)
 * @param {boolean} visible whether the progress bar should be shown
 */
export function setProgressVisible({ progress, status }, visible) {
    if (progress) progress.hidden = !visible
    if (status) status.hidden = visible
}

/**
 * Status text for a finished save. Includes the time so each new save is
 * visibly confirmed.
 *
 * @param {Date} date when the save finished
 * @param {string|string[]} [locale] defaults to the browser locale
 * @returns {string}
 */
export function formatSavedStatus(date, locale) {
    const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    return `Changes saved at ${time}`
}
