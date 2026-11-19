// Data helpers for per-element dropdown questions ("Select Elements + Dropdown").
//
// An instructor's question for an element is stored on the SVG element itself, as attributes, so it
// is saved with the visual by autosave like the "label" and "selectable" settings are. Storing it in
// the SVG means the question needs no database or API change, and it stays attached to the element
// even if elements are reordered.
//
// This module must not import visualizer.js, which reads the DOM on import, so it can be unit tested.

export const QUESTION_ATTRIBUTE = "dropdown-question"
export const CHOICES_ATTRIBUTE = "dropdown-choices"

/**
 * Returns the question set on an element, or null if it has none or its data is unusable.
 * Unusable data (hand-edited or corrupted SVG) is treated as no question, so a bad element cannot
 * leave students with a question they are unable to answer.
 * @param {Element} element
 * @returns {{question: string, choices: string[]}|null}
 */
export function readElementQuestion(element) {
    const question = element?.getAttribute(QUESTION_ATTRIBUTE)
    if (!question) return null

    let choices
    try {
        choices = JSON.parse(element.getAttribute(CHOICES_ATTRIBUTE))
    } catch {
        return null
    }
    if (!Array.isArray(choices)) return null

    choices = choices.filter(choice => typeof choice === "string" && choice.trim())
    return choices.length ? { question, choices } : null
}

/**
 * Sets an element's question. Text is trimmed and blank answers are dropped. A question with no text
 * or no answers is not saved, because students could not answer it, and the element is left unchanged.
 * @param {Element} element
 * @param {string} question
 * @param {string[]} choices
 * @returns {boolean} true if the question was saved
 */
export function writeElementQuestion(element, question, choices) {
    const text = (question || "").trim()
    const cleaned = (choices || []).map(choice => String(choice).trim()).filter(Boolean)
    if (!text || !cleaned.length) return false

    element.setAttribute(QUESTION_ATTRIBUTE, text)
    element.setAttribute(CHOICES_ATTRIBUTE, JSON.stringify(cleaned))
    return true
}

/**
 * Removes an element's question.
 * @param {Element} element
 */
export function clearElementQuestion(element) {
    element.removeAttribute(QUESTION_ATTRIBUTE)
    element.removeAttribute(CHOICES_ATTRIBUTE)
}

/**
 * Returns the elements that have a usable question, in document order.
 * @param {Iterable<Element>} elements the visualization's visual elements
 * @returns {Element[]}
 */
export function questionElements(elements) {
    return Array.from(elements).filter(element => readElementQuestion(element))
}

/**
 * Builds the student's answers for saving.
 * Each answer keeps the question text it answered, because published surveys read the live SVG, and
 * an instructor could change the question after a student has answered it.
 * @param {Iterable<Element>} elements the visualization's visual elements
 * @param {Map<string, string>} chosen answer text by visualId
 * @returns {{answers: {id: string, question: string, choice: string}[], unanswered: number}}
 */
export function collectAnswers(elements, chosen) {
    const answers = []
    let unanswered = 0

    for (const element of questionElements(elements)) {
        const id = element.getAttribute("visualId")
        const { question, choices } = readElementQuestion(element)
        const choice = chosen.get(id)

        if (choice && choices.includes(choice)) {
            answers.push({ id, question, choice })
        } else {
            unanswered++
        }
    }

    return { answers, unanswered }
}

/**
 * Turns saved answers back into the chosen-answer map.
 * Answers are dropped when their element no longer has a question or their choice is no longer
 * offered, so the student is asked again instead of keeping an answer that does not fit.
 * @param {*} saved the parsed saved response
 * @param {Iterable<Element>} elements the visualization's visual elements
 * @returns {Map<string, string>}
 */
export function restoreAnswers(saved, elements) {
    const chosen = new Map()
    if (!Array.isArray(saved)) return chosen

    const byId = new Map()
    for (const element of questionElements(elements)) {
        byId.set(element.getAttribute("visualId"), readElementQuestion(element))
    }

    for (const answer of saved) {
        const id = answer?.id == null ? null : String(answer.id)
        const question = byId.get(id)
        if (question && question.choices.includes(answer.choice)) {
            chosen.set(id, answer.choice)
        }
    }

    return chosen
}

/**
 * Works out where the popup goes: to the right of the element if it fits, otherwise to the left,
 * and kept inside the frame vertically. Sizes are in CSS pixels relative to the frame.
 * @param {{left: number, right: number, top: number}} target element's bounding rectangle
 * @param {{width: number, height: number}} card popup size
 * @param {{width: number, height: number}} frame visible area size
 * @param {number} gap space between element and popup
 * @returns {{left: number, top: number}}
 */
export function placeCard(target, card, frame, gap = 8) {
    let left = target.right + gap
    if (left + card.width > frame.width) left = target.left - gap - card.width
    left = Math.max(gap, Math.min(left, frame.width - card.width - gap))

    const top = Math.max(gap, Math.min(target.top, frame.height - card.height - gap))
    return { left, top }
}

/**
 * Remembers where the popup sits relative to its element, so it can follow the element when the
 * visual is panned or zoomed. The offset is kept from the edge the popup was placed beside, so a
 * popup on the right stays to the right when zooming changes the element's width.
 * @param {{left: number, right: number, top: number}} target element's rectangle when the popup opened
 * @param {{left: number, top: number}} position where the popup was placed
 * @returns {{side: string, dx: number, dy: number}}
 */
export function anchorCard(target, position) {
    const side = position.left >= target.right ? "right" : "left"
    return {
        side,
        dx: position.left - (side === "right" ? target.right : target.left),
        dy: position.top - target.top
    }
}

/**
 * Where the popup goes for the element's current rectangle. Not kept inside the frame: the popup
 * moves off-screen with its element, like the rest of the visual.
 * @param {{left: number, right: number, top: number}} target element's current rectangle
 * @param {{side: string, dx: number, dy: number}} anchor from anchorCard
 * @returns {{left: number, top: number}}
 */
export function followCard(target, anchor) {
    return {
        left: (anchor.side === "right" ? target.right : target.left) + anchor.dx,
        top: target.top + anchor.dy
    }
}

/**
 * True when the pointer moved far enough between press and release to be a drag (a pan), not a click.
 * @param {{x: number, y: number}|null} down where the button was pressed
 * @param {{x: number, y: number}} up where the click happened
 * @param {number} threshold pixels the pointer may wobble during a click
 * @returns {boolean}
 */
export function isDrag(down, up, threshold = 4) {
    if (!down) return false
    return Math.hypot(up.x - down.x, up.y - down.y) > threshold
}

/**
 * What Enter does in the instructor popup: move to the next answer box, or add one after the last.
 * Enter in a blank last box stays put, so repeated presses do not pile up empty answers.
 * @param {number} index answer box Enter was pressed in, or -1 for the question box
 * @param {string[]} answers current answer box values
 * @returns {number|"add"} index of the answer box to focus, or "add" for a new one
 */
export function nextAnswerStep(index, answers) {
    if (index + 1 < answers.length) return index + 1
    if (index >= 0 && !answers[index].trim()) return index
    return "add"
}
