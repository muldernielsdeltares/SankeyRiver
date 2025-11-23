import { Flow } from '../models/Flow';
import { Node } from '../models/Node';
import {SankeyConfig} from "../Sankey";

export function generateBaseStyles(config:SankeyConfig) {
    return `rect[id^='node-']{fill:#777}\n`+
        `path[id^='flow-']{opacity:0.6;fill:#ddd;&:hover{opacity:1}}\n`+
        `path.flowvalue-zero{stroke:#ddd;stroke-width:1}\n`+
        `g[id^='label-node']{pointer-events:none;rect{fill:#fff}}\n`+
        `*{font-size:${config.fontsize}pt}`
}
export function generateStyles(nodeMap: Map<string, Node>, flows: Flow[]): string {
    let styles = '';

    for (const node of nodeMap.values()) {
        const styleStr = objectToCSS(node.style);
        if (styleStr) {
            styles += `#node-${node.idClean} { ${styleStr} }\n`;
        }
    }

    for (const flow of flows) {
        const styleStr = objectToCSS(flow.style);
        if (styleStr) {
            styles += `#flow-${flow.idClean} { ${styleStr} }\n`;
        }
    }

    return styles;
}

function objectToCSS(style?: Record<string, string>): string {
    if (!style) return
    return Object.entries(style)
        .map(([k, v]) => `${k}:${v};`)
        .join(' ');
}
