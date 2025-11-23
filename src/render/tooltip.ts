import {SankeyConfig} from "../Sankey";

let tooltipId = '';
let tooltipRect: any
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

export function makeTooltip(containerId:string, config:SankeyConfig) {
    const el = document.createElement("div");
    tooltipId = `${containerId}-tooltip`
    el.setAttribute('id', tooltipId);
    el.setAttribute('style', `font-size:${config.fontsize}pt;background:#000;border-radius:5px;padding:5px;color:#fff;position:absolute;display:none;`)
    document.body.appendChild(el);
}

export function finalizeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach((el) => {
        const text = el.getAttribute('data-tooltip')
        if (text) {
            el.addEventListener('mouseenter', openTooltip(text))
            el.addEventListener('mousemove', moveTooltip())
            el.addEventListener('mouseleave', closeTooltip())
        }
    })
}
function getTooltip() {
    return document.getElementById(tooltipId);
}

function openTooltip(text) {
    return () => {
        let tooltip = getTooltip();
        tooltip.innerHTML = text;
        tooltip.style.display = "block";
        tooltipRect = tooltip.getBoundingClientRect();
    }
}

function moveTooltip() {
    return (event) => {
        let tooltip = getTooltip();
        tooltipRect = tooltip.getBoundingClientRect();

        // Base coordinates: client position + current scroll offsets
        let x = event.clientX + window.scrollX + 10;
        let y = event.clientY + window.scrollY + 10;

        // Prevent tooltip from going off the right/bottom edge of the viewport
        if (event.clientX + tooltipRect.width + 20 > viewportWidth) {
            x = event.clientX + window.scrollX - tooltipRect.width - 10;
        }

        if (event.clientY + tooltipRect.height + 20 > viewportHeight) {
            y = event.clientY + window.scrollY - tooltipRect.height - 10;
        }

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';

    }
}

function closeTooltip() {
    return function() {
        let tooltip = getTooltip();
        tooltip.style.display = "none";
    }
}