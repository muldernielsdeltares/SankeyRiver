let tooltipId = '';

export function makeTooltip(containerId:string, container:HTMLElement, config) {
    const el = document.createElement("div");
    tooltipId = `${containerId}-tooltip`
    el.setAttribute('id', tooltipId);
    el.setAttribute('style', `font-size:${config.fontsize}pt;background:#000;border-radius:5px;padding:5px;color:#fff;position:absolute;display:none;`)
    container.parentNode.insertBefore(el, container)
    document.getElementById("tooltip");
}

export function finalizeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach((el) => {
        const text = el.getAttribute('data-tooltip')
        el.addEventListener('mousemove', openTooltip(text))
        el.addEventListener('mouseout', closeTooltip())
    })
}
function getTooltip() {
    return document.getElementById(tooltipId);
}
function openTooltip(text) {
    return (event) => {
        if(!text) {
            return
        }
        let tooltip = getTooltip();
        tooltip.innerHTML = text;
        tooltip.style.display = "block";
        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = event.pageY + 10 + 'px';

    }
}

function closeTooltip() {
    return function(event) {
        let tooltip = getTooltip();
        tooltip.style.display = "none";
    }
}