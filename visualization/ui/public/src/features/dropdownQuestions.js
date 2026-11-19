// Per-element dropdown questions for the "Select Elements + Dropdown" question type.
//
//  - Editor: the "Element Questions" tool. Clicking an element opens a popup where the instructor types
//    a question and its answer choices. They are saved on the element (see dropdownQuestionData.js).
//  - Participant (mode selectDropdown): clicking an element that has a question opens a popup with the
//    question and a dropdown of its answers. An answer is kept as soon as it is picked, and the popup
//    closes on click-off or Esc. Answers stay here until the survey page asks for them with the
//    "dropdownAnswers" message (see visualizer.js processMessage).

import { visualizationElement, svgElement, wrapper, page, visualContainer, autosave } from "../visualizer.js"
import { findVisualElement } from "./elementEvents.js"
import {
    readElementQuestion,
    writeElementQuestion,
    clearElementQuestion,
    clearAllElementQuestions,
    collectAnswers,
    restoreAnswers,
    placeCard,
    anchorCard,
    followCard,
    isDrag,
    nextAnswerStep
} from "./dropdownQuestionData.js"

const MODELABEL_EDITOR = "dropdownEditor"
// The visual editor's default tool, which it returns to when element questions stop applying
const MODELABEL_DEFAULT_EDITOR = "detailEditor"
const MODELABEL_PARTICIPANT = "selectDropdown"
const TOOLTEXT_EDITOR = "Element Questions"

// Participant only and never saved into the SVG, so it can be a class.
const ANSWERED_CLASS = "answered"
// Marks the element the popup is open for, so it stays highlighted. Removed before every save so it
// never ends up in the stored SVG.
const EDITING_CLASS = "dropdown-editing"

// Student answers by visualId
let chosen = new Map()
// Element the popup is open for, and what had focus before it opened
let current = null
let returnFocus = null
// Where the popup sits relative to current, so it can follow the element when the visual moves
let anchor = null
let following = false
// Where the mouse was last pressed, to tell a pan from a click
let pressedAt = null
// The Element Questions tool button. Hidden until the question editor page switches to the tool, so it
// only appears for Select Elements + Dropdown questions.
let toolButton = null
// The popup's parts (visualizer.handlebars), looked up once when the listeners are added
let ui = null

export const dropdownQuestions = (visualizer) => {
    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onPageLoadAsEditor = function() {
        visualizer.onPageLoadAsEditor()
        toolButton = page.addTool(TOOLTEXT_EDITOR, MODELABEL_EDITOR)
        toolButton.hidden = true
    }

    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
        // Another editor action (such as the Details on Hover checkbox) can autosave while the popup is
        // open, which would store the highlight class; clear any that came back with the SVG.
        for (const element of svgElement.querySelectorAll(`.${EDITING_CLASS}`)) element.classList.remove(EDITING_CLASS)
        enableListeners()
        markAnswered()
    }

    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()
        closeCard()
        // The question editor page opens this tool for dropdown questions (setEditorMode), which is
        // the only way into it while the button is hidden.
        if (page.mode === MODELABEL_EDITOR && toolButton) toolButton.hidden = false
    }

    return decoratedVisualizer
}

/**
 * Reply for the survey page's "dropdownAnswers" request.
 * @returns {{answers: Object[], unanswered: number}}
 */
export function getDropdownAnswers() {
    return collectAnswers(visualizationElement.visualElements, chosen)
}

/**
 * Replaces the student's answers with saved ones. Replacing rather than merging makes repeated
 * loads safe; the survey page sends the saved answers twice per page load.
 * @param {Object[]} saved
 */
export function loadDropdownAnswers(saved) {
    chosen = restoreAnswers(saved, visualizationElement.visualElements)
    markAnswered()
}

/**
 * Removes every element question from the visual and saves it, for when the question is changed to
 * another type. Also hides the Element Questions tool and leaves it, so no new questions can be added.
 * Saves only if something was removed.
 */
export function clearDropdownQuestions() {
    closeCard()
    if (toolButton) toolButton.hidden = true
    if (page.mode === MODELABEL_EDITOR) page.mode = MODELABEL_DEFAULT_EDITOR
    if (clearAllElementQuestions(visualizationElement.visualElements) > 0) autosave.save()
}

function enableListeners() {
    // visualContainer outlives SVG reloads, so the delegated listeners only need adding once
    if (ui) return
    ui = {
        card: document.getElementById("dropdown-card"),
        editor: document.getElementById("dropdown-editor"),
        participant: document.getElementById("dropdown-participant"),
        questionInput: document.getElementById("dropdown-question-input"),
        answerList: document.getElementById("dropdown-answer-list"),
        error: document.getElementById("dropdown-editor-error"),
        save: document.getElementById("dropdown-save"),
        remove: document.getElementById("dropdown-remove"),
        questionText: document.getElementById("dropdown-question-text"),
        answerSelect: document.getElementById("dropdown-answer-select")
    }

    // The wrapper pans on mousedown and cancels the default action, which would stop the popup's
    // inputs and select from taking focus or opening.
    ui.card.addEventListener("mousedown", evt => evt.stopPropagation())
    ui.card.addEventListener("keydown", evt => {
        if (evt.key === "Escape") closeCard()
        // Shift+Enter saves from anywhere in the instructor popup, the same as clicking Save (including
        // staying open with an error if the question or answers are missing).
        if (evt.key === "Enter" && evt.shiftKey && !ui.editor.hidden) {
            evt.preventDefault()
            ui.save.click()
            return
        }
        if (evt.key === "Enter" && evt.target.matches("#dropdown-question-input, .dropdown-answer-input")) {
            evt.preventDefault()
            const inputs = answerInputs()
            const step = nextAnswerStep(inputs.indexOf(evt.target), inputs.map(input => input.value))
            if (step === "add") {
                addAnswerInput("").focus()
            } else {
                inputs[step].focus()
            }
        }
    })

    // Capture phase, so it records the press before the card or the wrapper's pan handler can stop it.
    document.addEventListener("mousedown", evt => {
        pressedAt = { x: evt.clientX, y: evt.clientY }
    }, true)

    visualContainer.addEventListener("click", evt => {
        if (page.mode !== MODELABEL_EDITOR && page.mode !== MODELABEL_PARTICIPANT) return
        // Releasing the mouse after panning also fires a click; that should not close or open a popup.
        if (isDrag(pressedAt, { x: evt.clientX, y: evt.clientY })) return

        const element = findVisualElement(evt.target, visualizationElement?.svg)
        if (!element) {
            closeCard()
            return
        }

        if (page.mode === MODELABEL_EDITOR) {
            // A foreignObject wraps an uploaded picture, which is the background, so clicking it counts as
            // clicking off; questions go on the elements drawn over it.
            if (element.tagName === "foreignObject") {
                closeCard()
            } else {
                openEditor(element)
            }
        } else if (readElementQuestion(element)) {
            openQuestion(element)
        } else {
            // An element without a question, such as the background image, counts as clicking off.
            closeCard()
        }
    })

    // Clicks on the page outside the visual (zoom buttons, empty space) also close the popup.
    // composedPath() is checked rather than contains(), because an answer's × button removes itself
    // before the click gets here, and a removed button is no longer inside the card.
    document.addEventListener("click", evt => {
        if (isDrag(pressedAt, { x: evt.clientX, y: evt.clientY })) return
        const path = evt.composedPath()
        if (!path.includes(ui.card) && !path.includes(visualContainer)) closeCard()
    })

    // A student clicking elsewhere on the survey page moves focus out of this frame. The editor keeps
    // its popup open, so an instructor's unsaved question is not lost by clicking the page around it.
    window.addEventListener("blur", () => {
        if (page.mode === MODELABEL_PARTICIPANT) closeCard()
    })

    document.getElementById("dropdown-add-answer").addEventListener("click", () => {
        addAnswerInput("").focus()
    })

    ui.save.addEventListener("click", () => {
        if (!current) return
        const choices = answerInputs().map(input => input.value)
        if (!writeElementQuestion(current, ui.questionInput.value, choices)) {
            showEditorError("Type a question and at least one answer, or use Remove question.")
            return
        }
        closeCard()
        autosave.save()
    })

    ui.remove.addEventListener("click", () => {
        if (!current) return
        clearElementQuestion(current)
        closeCard()
        autosave.save()
    })

    document.getElementById("dropdown-cancel").addEventListener("click", closeCard)

    // The answer is saved as soon as it changes, but the popup stays open until the student clicks off
    // it or presses Esc. Closing on change was inconsistent: picking the answer that is already chosen
    // fires no change event (so it stayed open), while arrow keys fire one per step (so it closed early).
    ui.answerSelect.addEventListener("change", evt => {
        if (!current) return
        const id = current.getAttribute("visualId")
        if (evt.target.value) {
            chosen.set(id, evt.target.value)
        } else {
            chosen.delete(id)
        }
        markAnswered()
    })
}

function openEditor(element) {
    const existing = readElementQuestion(element)

    ui.questionInput.value = existing?.question || ""
    ui.answerList.replaceChildren()
    for (const choice of existing?.choices || ["", ""]) addAnswerInput(choice)
    ui.remove.hidden = !existing
    showEditorError("")

    showCard(element, ui.editor)
    ui.questionInput.focus()
}

function openQuestion(element) {
    const { question, choices } = readElementQuestion(element)

    ui.questionText.textContent = question
    ui.answerSelect.replaceChildren(new Option("Choose...", ""))
    for (const choice of choices) ui.answerSelect.add(new Option(choice, choice))
    ui.answerSelect.value = chosen.get(element.getAttribute("visualId")) || ""

    showCard(element, ui.participant)
    ui.answerSelect.focus()
}

// Adds an answer box to the instructor popup and returns its input
function addAnswerInput(value) {
    const row = document.createElement("div")
    row.className = "input-group input-group-sm mb-1"

    const input = document.createElement("input")
    input.type = "text"
    input.className = "form-control dropdown-answer-input"
    input.value = value

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "btn btn-outline-secondary"
    remove.textContent = "×"
    remove.addEventListener("click", () => {
        row.remove()
        numberAnswers()
    })

    row.append(input, remove)
    ui.answerList.appendChild(row)
    numberAnswers()
    return input
}

// Screen readers announce answers by number, so the labels are redone whenever an answer is added or
// removed to keep them matching what is on screen.
function numberAnswers() {
    Array.from(ui.answerList.children).forEach((row, index) => {
        const [input, remove] = row.children
        input.setAttribute("aria-label", `Answer ${index + 1}`)
        remove.setAttribute("aria-label", `Remove answer ${index + 1}`)
    })
}

function answerInputs() {
    return Array.from(ui.answerList.getElementsByClassName("dropdown-answer-input"))
}

function showEditorError(message) {
    ui.error.textContent = message
    ui.error.hidden = !message
}

// Opens the popup for element with the given section (ui.editor or ui.participant) showing
function showCard(element, section) {
    if (!current) returnFocus = document.activeElement
    current?.classList.remove(EDITING_CLASS)
    current = element
    current.classList.add(EDITING_CLASS)

    ui.editor.hidden = section !== ui.editor
    ui.participant.hidden = section !== ui.participant
    ui.card.hidden = false

    // Measure after showing, so the card has a size. On opening, the popup is kept inside the frame;
    // after that it follows the element as the visual is panned or zoomed.
    const frame = wrapper.getBoundingClientRect()
    const target = elementRect(element)
    const position = placeCard(target, { width: ui.card.offsetWidth, height: ui.card.offsetHeight }, { width: frame.width, height: frame.height })
    anchor = anchorCard(target, position)
    moveCard(position)

    if (!following) {
        following = true
        requestAnimationFrame(followElement)
    }
}

// Panning and zooming change the visual's viewBox without an event to listen for, so while the popup
// is open it re-measures its element once per frame and moves with it.
function followElement() {
    if (!current) {
        following = false
        return
    }
    moveCard(followCard(elementRect(current), anchor))
    requestAnimationFrame(followElement)
}

// Element rectangle relative to the wrapper the popup is positioned in
function elementRect(element) {
    const frame = wrapper.getBoundingClientRect()
    const target = element.getBoundingClientRect()
    return { left: target.left - frame.left, right: target.right - frame.left, top: target.top - frame.top }
}

function moveCard({ left, top }) {
    ui.card.style.left = `${left}px`
    ui.card.style.top = `${top}px`
}

function closeCard() {
    if (!ui || ui.card.hidden) return
    ui.card.hidden = true
    current?.classList.remove(EDITING_CLASS)
    current = null
    anchor = null
    returnFocus?.focus?.()
    returnFocus = null
}

// Participant view only: answered elements stop pulsing (see style.css).
function markAnswered() {
    if (page.mode !== MODELABEL_PARTICIPANT || !svgElement) return
    for (const element of visualizationElement.visualElements) {
        element.classList.toggle(ANSWERED_CLASS, chosen.has(element.getAttribute("visualId")))
    }
}
