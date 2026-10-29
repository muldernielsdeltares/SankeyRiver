import { SankeyConfig } from "../Sankey"

export function makeTooltip(containerId: string, config: SankeyConfig): HTMLElement {
    //reuse tooltip of a previous render in the same container
    const tooltipId = `${containerId}-tooltip`
    const el = document.getElementById(tooltipId) ?? document.createElement("div")
    el.setAttribute("id", tooltipId)
    el.setAttribute(
        "style",
        `font-size:${config.fontsize}pt;background:#000;border-radius:5px;padding:5px;color:#fff;position:absolute;display:none;`,
    )
    if (!el.isConnected) document.body.appendChild(el)
    return el
}

export function finalizeTooltips(svg: SVGSVGElement, tooltip: HTMLElement) {
    svg.querySelectorAll<SVGElement>("[data-tooltip]").forEach((el) => {
        const text = el.getAttribute("data-tooltip")
        if (text) {
            el.addEventListener("mouseenter", openTooltip(tooltip, text))
            el.addEventListener("mousemove", moveTooltip(tooltip))
            el.addEventListener("mouseleave", closeTooltip(tooltip))
        }
    })
}

function openTooltip(tooltip: HTMLElement, text: string) {
    return () => {
        tooltip.innerHTML = text
        tooltip.style.display = "block"
    }
}

function moveTooltip(tooltip: HTMLElement) {
    return (event: MouseEvent) => {
        const tooltipRect = tooltip.getBoundingClientRect()

        // Base coordinates: client position + current scroll offsets
        let x = event.clientX + window.scrollX + 10
        let y = event.clientY + window.scrollY + 10

        // Prevent tooltip from going off the right/bottom edge of the viewport
        if (event.clientX + tooltipRect.width + 20 > window.innerWidth) {
            x = event.clientX + window.scrollX - tooltipRect.width - 10
        }

        if (event.clientY + tooltipRect.height + 20 > window.innerHeight) {
            y = event.clientY + window.scrollY - tooltipRect.height - 10
        }

        tooltip.style.left = x + "px"
        tooltip.style.top = y + "px"
    }
}

function closeTooltip(tooltip: HTMLElement) {
    return () => {
        tooltip.style.display = "none"
    }
}
