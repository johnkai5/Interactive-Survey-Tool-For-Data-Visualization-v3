import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer, autosave, staticvis, hoverDetails } from "../visualizer.js"
import { findClickDetailTarget, findHoverDetailTarget } from "./elementEvents.js"

// the element whose details are being edited, or null
let selection = null;
// visualContainer outlives SVG reloads, so the delegated listeners only need adding once
let detailListenersAdded = false

export const detailTooltip = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    // calls when the SVG is first loaded
    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        // new code here
    }

    // calls every time the SVG is loaded
    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
		const isEditor = wrapper.classList.contains("editor")
		if ((hoverDetails["enabled"] || isEditor) && !staticvis) {
        document.getElementById("tooltip-container").removeAttribute("hidden");
		}
        if (hoverDetails["enabled"] && !staticvis) {
            document.getElementById("tooltip-detail").removeAttribute("hidden");
        }
        markCreatedDetails()
        enableDetailListeners()
    }

    // calls on page DOM contents loaded, regardless of role
    decoratedVisualizer.onPageLoad = function() {
        visualizer.onPageLoad()
        // new code here
    }

    // calls on page DOM contents loaded as a paricipant
    decoratedVisualizer.onPageLoadAsParticipant = function() {
        visualizer.onPageLoadAsParticipant()
        // new code here
    }

    // calls on page DOM contents loaded as an editor
    decoratedVisualizer.onPageLoadAsEditor = function() {
        visualizer.onPageLoadAsEditor()
        document.getElementById("tooltip-setting").removeAttribute("hidden");
        document.getElementById("checkTooltip").addEventListener('change', function(e){
            hoverDetails["enabled"] = document.getElementById("checkTooltip").checked;
            if (hoverDetails["enabled"]) {
                document.getElementById("tooltip-detail").removeAttribute("hidden");
                document.getElementById("controlTooltip").removeAttribute("disabled");
                document.getElementById("modifyButton").removeAttribute("disabled");
            } else {
                document.getElementById("tooltip-detail").hidden = true;
                document.getElementById("controlTooltip").setAttribute('disabled', true);
                document.getElementById("modifyButton").setAttribute('disabled', true);
            }
            autosave.save();
        });

        // Overrides viewport dragging if clicking on input
        document.getElementById("controlTooltip").addEventListener("click", function() {
            if (page.mode == "detailEditor") {
                document.getElementById("controlTooltip").focus();
            }
        });

        // Leave focus if clicking on background
        document.getElementById("visual-container").addEventListener("click", function(e) {
            if (e.target.tagName === "svg"){
                document.getElementById("controlTooltip").blur();
                selection = null;
                document.getElementById("controlTooltip").setAttribute('disabled', true);
                document.getElementById("modifyButton").setAttribute('disabled', true);
            }
        });

        // Manage detail editing
        document.getElementById("modifyButton").addEventListener("click", function() {

            if (!selection){ return }

            document.getElementById("controlTooltip").blur();
            const newDetail = document.getElementById("controlTooltip").value
            document.getElementById("controlTooltip").value = ""

            selection.setAttribute('label', newDetail);
            showDetail(selection)
            selection = null
            autosave.save();
        });
        page.mode = "detailEditor"
    }

    // calls on page DOM contents loaded in debug mode
    decoratedVisualizer.onPageLoadDebug = function() {
        visualizer.onPageLoadDebug()
        // new code here
    }

    // calls when the page mode is changed
    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()
        // new code here
        if (!svgElement) { return }
        markCreatedDetails()
    }

    return decoratedVisualizer
}

function showDetail(item) {
    document.getElementById("tooltip-detail").textContent = item.getAttribute("label") || item.id || item.getAttribute("visualId") || "No Information"
}

// Drawn shapes get the createdDetail class only while the detail editor is open
function markCreatedDetails() {
    if (page.mode == "detailEditor") {
        for (const element of svgElement.querySelectorAll(".custom:not(foreignObject)")) {
            element.classList.add("createdDetail");
        }
    } else {
        for (const element of svgElement.querySelectorAll(".createdDetail")) {
            element.classList.remove("createdDetail");
        }
    }
}

// Delegated listeners on visualContainer replace the click and mouseenter listeners that used to be
// added to every SVG element on each load and each mode change, which piled up with every tool switch.
function enableDetailListeners() {
    if (detailListenersAdded) return
    detailListenersAdded = true

    visualContainer.addEventListener("click", function(e) {
        if (page.mode != "detailEditor") return
        const item = findClickDetailTarget(e.target, svgElement)
        if (!item) return

        selection = item
        showDetail(item)
        document.getElementById("controlTooltip").removeAttribute("disabled");
        document.getElementById("modifyButton").removeAttribute("disabled");
        document.getElementById("controlTooltip").focus();
    })

    // mouseenter does not bubble, so mouseover stands in for it
    visualContainer.addEventListener("mouseover", function(e) {
        if (selection != null) return
        const item = findHoverDetailTarget(e.target, svgElement)
        if (item) showDetail(item)
    })
}