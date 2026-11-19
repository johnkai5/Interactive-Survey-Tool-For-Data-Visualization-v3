// Decides whether a message may change the editor. Any page can frame the visual editor or hold a
// reference to it and post messages, so editor-changing messages must come from the window this frame is
// embedded in AND from the main app's origin. Kept free of DOM globals so it can be unit tested.

// The configured main app URL (MAIN_UI_URL) may include a path or trailing slash, but event.origin never
// does, so compare origins only. An unset or malformed value gives null, which trusts nothing.
export function originOf(url) {
    if (!url) return null
    try {
        const { origin } = new URL(url)
        return origin === "null" ? null : origin
    } catch {
        return null
    }
}

// ownWindow is passed in because a top-level page is its own parent, which must not count as embedded
export function isFromTrustedParent(event, ownWindow, trustedOrigin) {
    if (!event || !ownWindow || !trustedOrigin) return false
    const parent = ownWindow.parent
    if (!parent || parent === ownWindow) return false
    return event.source === parent && event.origin === trustedOrigin
}
