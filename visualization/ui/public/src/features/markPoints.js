// enables marking coordinate points on a visual as a participant

const MODELABEL_MARK_POINTS = "markPoints"

const OPTIONTEXT_CLEAR_MARKS = "Clear all marks"

import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer } from "../visualizer.js"
import { actionHistory } from "./actionHistory.js"

// Create points with a unified structure
function createPoint(x, y) {
    const point = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    )

    point.setAttribute("cx", x)
    point.setAttribute("cy", y)
    point.setAttribute("class", "mark")

    return point
}

const pointsReceiver = {
    read() {
        return Array.from(
            visualizationElement.svg.querySelectorAll(
                ".mark-container .mark"
            ),
            point => ({
                x: point.getAttribute("cx"),
                y: point.getAttribute("cy"),
            })
        )
    },

    restore(points) {
        const svg = visualizationElement.svg
        let container = svg.querySelector(".mark-container")

        for (const point of svg.querySelectorAll(".mark-container .mark")) {
            point.remove()
        }

        if (!container && points.length > 0) {
            container = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "g"
            )

            container.classList.add("mark-container")
            svg.appendChild(container)
        }

        for (const coordinates of points) {
            container.appendChild(
                createPoint(coordinates.x, coordinates.y)
            )
        }
    },
}

export const markPoints = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        if (page.mode == MODELABEL_MARK_POINTS) {
            // undo button
            page.addOption(OPTIONTEXT_CLEAR_MARKS, MODELABEL_MARK_POINTS, () => {
                // it should just be the last one in the DOM
                actionHistory.capture(pointsReceiver, () => {
                        pointsReceiver.restore([])
                    })
            })

            enableMarkPoints()
        }
    }

    return decoratedVisualizer
}

function enableMarkPoints() {
    let mouseDrag = false
    let markContainer = null

    // mouseDrag variable is kept track of so mark isn't accidently left after clicking and dragging (panning)
    visualContainer.addEventListener("mousedown", () => {
        mouseDrag = false
    })

    visualContainer.addEventListener("mousemove", () => {
        mouseDrag = true
    })

    visualContainer.addEventListener("click", (evt) => {
        if (mouseDrag || page.mode !== MODELABEL_MARK_POINTS) return

        const svg = visualizationElement.svg
        let container = svg.querySelector(".mark-container")

        const max = Number(
            document.getElementById("question-max").value
        )

        const total = pointsReceiver.read().length

        if (max > 0 && total >= max) return

        actionHistory.capture(pointsReceiver, () => {
            if (!container) {
                container = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "g"
                )

                container.classList.add("mark-container")
                svg.appendChild(container)
            }

            const coordinates = screenToSVG(evt.clientX, evt.clientY, svg)

            container.appendChild(
                createPoint(coordinates.x, coordinates.y)
            )
        })
    })
}