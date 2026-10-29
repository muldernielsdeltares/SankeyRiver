import { Flow } from "../models/Flow"
import { Node } from "../models/Node"
import { SankeyConfig } from "../Sankey"

// Default styles have zero specificity (:where), so any user CSS overrides them
export function generateBaseStyles(config: SankeyConfig) {
    const svg = `svg#${config.id}`
    return (
        `:where(${svg}) {font-size:${config.fontsize}pt}\n` +
        `:where(${svg} rect[id^='node-']) {fill:#777}\n` +
        `:where(${svg} path[id^='flow-']) {opacity:0.6;fill:#ddd}\n` +
        `:where(${svg} path[id^='flow-']:hover) {opacity:1}\n` +
        `:where(${svg} path.flowvalue-zero) {stroke:#ddd;stroke-width:1}\n` +
        `:where(${svg} g[id^='label-node']) {pointer-events:none}\n` +
        `:where(${svg} g[id^='label-node'] rect) {fill:#fff}\n`
    )
}
export function generateStyles(
    nodeMap: Map<string, Node>,
    flows: Flow[],
    config: SankeyConfig,
): string {
    let styles = ""

    for (const node of nodeMap.values()) {
        const styleStr = objectToCSS(node.style)
        if (styleStr) {
            styles += `svg#${config.id} #node-${node.idClean} { ${styleStr} }\n`
        }
    }

    for (const flow of flows) {
        const styleStr = objectToCSS(flow.style)
        if (styleStr) {
            styles += `svg#${config.id} #flow-${flow.idClean} { ${styleStr} }\n`
        }
    }

    return styles
}

function objectToCSS(style?: Record<string, string>): string {
    if (!style) return
    return Object.entries(style)
        .map(([k, v]) => `${k}:${v};`)
        .join(" ")
}
