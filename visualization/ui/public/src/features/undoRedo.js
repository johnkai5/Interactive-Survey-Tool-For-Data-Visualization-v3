// Create Undo/Redo buttons
// on the participant's response page.

import { actionHistory } from "./actionHistory.js"
import { wrapper, staticvis } from "../visualizer.js"

export const undoRedo = (visualizer) => {
    const decorated = Object.create(visualizer)

    decorated.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()

        if (
            staticvis ||
            wrapper.classList.contains("editor") ||
            wrapper.classList.contains("debug")
        ) {
            return
        }

        const modes = [
            "selectElements",
            "markPoints",
            "regionBox",
            "regionLasso",
        ]

        const params = new URLSearchParams(window.location.search)

        const supported = modes.some(mode =>
            wrapper.classList.contains(mode) ||
            params.get(mode) === "true"
        )

        // only for the supported question types
        if (!supported || document.getElementById("answer-history")) {
            return
        }

        const header = document.getElementById("button-header")
        if (!header) return

        const controls = document.createElement("span")
        controls.id = "answer-history"
        controls.setAttribute("role", "group")
        controls.setAttribute("aria-label", "Answer history")

        const undoButton = document.createElement("button")
        undoButton.type = "button"
        undoButton.textContent = "Undo"
        undoButton.setAttribute(
            "aria-label",
            "Undo last answer action"
        )

        const redoButton = document.createElement("button")
        redoButton.type = "button"
        redoButton.textContent = "Redo"
        redoButton.setAttribute(
            "aria-label",
            "Redo last answer action"
        )

        undoButton.addEventListener("click", () => {
            actionHistory.undo()
        })

        redoButton.addEventListener("click", () => {
            actionHistory.redo()
        })

        actionHistory.onChange = () => {
            undoButton.disabled = !actionHistory.canUndo
            redoButton.disabled = !actionHistory.canRedo
        }

        controls.append(undoButton, redoButton)
        header.appendChild(controls)
        header.hidden = false

        actionHistory.onChange()
    }

    return decorated
}