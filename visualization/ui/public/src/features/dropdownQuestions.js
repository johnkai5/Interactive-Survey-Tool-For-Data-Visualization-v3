// Per-element dropdown questions ("Select Elements + Dropdown"): the editor's Element Questions tool,
// and the popup participants answer in. Answers stay here until the survey page asks for them with the
// "dropdownAnswers" message (see visualizer.js processMessage).

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
    isDrag
} from "./dropdownQuestionData.js"

const MODELABEL_EDITOR = "dropdownEditor"
const MODELABEL_DEFAULT_EDITOR = "detailEditor"
const MODELABEL_PARTICIPANT = "selectDropdown"
const TOOLTEXT_EDITOR = "Element Questions"

const ANSWERED_CLASS = "answered"
// Removed before every save so it never ends up in the stored SVG
const EDITING_CLASS = "dropdown-editing"

// Student answers by visualId
let chosen = new Map()
// Element the popup is open for
let current = null
let returnFocus = null
let anchor = null
let following = false
let pressedAt = null
// Hidden until the question editor page opens the tool, so it only appears for dropdown questions
let toolButton = null
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
        if (page.mode === MODELABEL_EDITOR && toolButton) toolButton.hidden = false
    }

    return decoratedVisualizer
}

export function getDropdownAnswers() {
    return collectAnswers(visualizationElement.visualElements, chosen)
}

// Replaces rather than merges, because the survey page sends the saved answers twice per page load
export function loadDropdownAnswers(saved) {
    chosen = restoreAnswers(saved, visualizationElement.visualElements)
    markAnswered()
}

// For when the question changes to another type: no element questions, and no way to add new ones
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
        answerInput: document.getElementById("dropdown-answer-input"),
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
        if (evt.key === "Enter" && evt.shiftKey && !ui.editor.hidden) {
            evt.preventDefault()
            ui.save.click()
            return
        }
        if (evt.key === "Enter" && evt.target === ui.questionInput) {
            evt.preventDefault()
            ui.answerInput.focus()
        }
        if (evt.key === "Enter" && evt.target === ui.answerInput) {
            evt.preventDefault()
            addTypedChoice()
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
            closeCard()
        }
    })

    // composedPath() rather than contains(): an answer's × button removes itself before the click gets
    // here, and a removed button is no longer inside the card.
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

    document.getElementById("dropdown-add-answer").addEventListener("click", addTypedChoice)

    ui.save.addEventListener("click", () => {
        if (!current) return
        // A choice typed but not yet added still counts, so it is not silently lost
        const choices = [...listedChoices(), ui.answerInput.value]
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

    // Not closed here: re-picking the current answer fires no change event and arrow keys fire one per
    // step, so closing on change was inconsistent. It closes on click-off or Esc instead.
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
    for (const choice of existing?.choices || []) addChoice(choice)
    ui.answerInput.value = ""
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

function addTypedChoice() {
    const choice = ui.answerInput.value.trim()
    if (choice) addChoice(choice)
    ui.answerInput.value = ""
    ui.answerInput.focus()
}

// Same markup as createChoice in main/ui/public/src/questionEdit.js (Multiple Choice and Radio)
function addChoice(choice) {
    const item = document.createElement("li")
    item.className = "list-group-item d-flex align-items-center py-2 px-3"

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "btn btn-outline-danger border-0 p-0 me-2"
    remove.setAttribute("aria-label", `Remove ${choice}`)
    remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    remove.addEventListener("click", () => item.remove())

    const text = document.createElement("span")
    text.className = "dropdown-choice-text"
    text.textContent = choice

    item.append(remove, text)
    ui.answerList.appendChild(item)
}

function listedChoices() {
    return Array.from(ui.answerList.getElementsByClassName("dropdown-choice-text"), text => text.textContent)
}

function showEditorError(message) {
    ui.error.textContent = message
    ui.error.hidden = !message
}

function showCard(element, section) {
    if (!current) returnFocus = document.activeElement
    current?.classList.remove(EDITING_CLASS)
    current = element
    current.classList.add(EDITING_CLASS)

    ui.editor.hidden = section !== ui.editor
    ui.participant.hidden = section !== ui.participant
    ui.card.hidden = false

    // Measured after showing, so the card has a size
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

// Panning and zooming give no event to listen for, so the open popup re-measures its element each frame
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

function markAnswered() {
    if (page.mode !== MODELABEL_PARTICIPANT || !svgElement) return
    for (const element of visualizationElement.visualElements) {
        element.classList.toggle(ANSWERED_CLASS, chosen.has(element.getAttribute("visualId")))
    }
}
