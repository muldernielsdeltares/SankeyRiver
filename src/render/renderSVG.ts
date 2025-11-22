import { Node } from '../models/Node';
import { Flow } from '../models/Flow';
import { generateBaseStyles, generateStyles} from './styles';
import {SankeyConfig} from "../Sankey";
import {generateFlowPath} from "./bezier";

const svgNS = 'http://www.w3.org/2000/svg';

const createElement = (qualifiedName:string, attributes:Record<string, string | number | null>):SVGElement => {
    const el = document.createElementNS(svgNS, qualifiedName)
    Object.entries(attributes).forEach(([k, v]) => {
            if (v) {
                el.setAttribute(k, String(v))
            }
        }
    )
    return el
}
export function createSVG(config:SankeyConfig, width:number, height:number): any {
    const svg = createElement('svg', {
        width,
        height,
        id: config.id
    })

    const groupNodes = createElement('g', {id:'nodes'})
    svg.appendChild(groupNodes);
    const groupFlows = createElement('g', {id:'flows'});
    svg.appendChild(groupFlows);
    const groupLabels = createElement('g', {id:'labels'});
    svg.appendChild(groupLabels);

    return {svg, groupNodes, groupFlows, groupLabels};
}

export function renderLabels(svg:SVGSVGElement, nodes:Map<string, Node>, config:SankeyConfig, maxX:number) {
    for (const node of nodes.values()) {
        if (!node.label.text) {
            node.label.width = 0
            node.label.height = 0
            continue
        }

        const group = createElement('g', {
            id: `label-node-${node.idClean}`,
            class: classNamesForColumn(node, maxX, 'label')
        })
        svg.appendChild(group)

        const text = createElement('text', {
            "font-size": `${config.fontsize}pt`,
        })
        group.appendChild(text)

        if (typeof node.label.text === "string") {
            const lines = node.label.text.split('\n')
            for (const line of lines) {
                const tspan = createElement('tspan', {
                    x: config.labelPadding,
                    dy: '1.2em',
                    "font-size": `${config.fontsize}pt`,
                })
                tspan.textContent = line
                text.appendChild(tspan)
            }
        }

        const bbox = text.getBBox();
        node.label.width = bbox.width + 2 * config.labelPadding
        node.label.height = bbox.height + 2 * config.labelPadding

        const rect = createElement('rect', {
            width: node.label.width,
            height: node.label.height,
            "font-size": `${config.fontsize}pt`,
        })
        group.insertBefore(rect, text)
    }
}

export function styling(svg:SVGSVGElement, nodes: Map<string, Node>, flows: Flow[], config) {
    const styleTag = document.createElementNS(svgNS, 'style');
    styleTag.textContent = `svg#${config.id}{\n${generateBaseStyles(config)}\n${generateStyles(nodes, flows)}}`
    svg.appendChild(styleTag);
}
export function scaling(nodes: Map<string, Node>, flows: Flow[], config:SankeyConfig, width:number, height:number, maxX:number, maxY:number, maxNodeWidth) {
    // scale canvas
    const labelSpace = config.labelSpaceLeft + config.labelSpaceRight
    const scaleX = (width - labelSpace - maxNodeWidth.get(maxX) - config.margin[1]-config.margin[3]) / maxX
    const scaleY = (height-config.margin[0]-config.margin[2])/maxY

    config.scaleX = scaleX
    config.scaleY = scaleY

    // Nodes
    for (const node of nodes.values()) {
        //node shift based on width
        const shift = node.x === 0 ? 0 :
            (
                (maxNodeWidth.get(node.x) - node.width) / (node.x === maxX ? 1 : 2)
            )
        //scaling
        node.x_ = node.x * scaleX + config.labelSpaceLeft + shift + config.margin[1]
        node.y_ = node.y * scaleY + config.margin[0]
        node.size_ = node.size * scaleY
    }
}

export function renderNodesFlows(svg:SVGSVGElement, groupNodes:SVGSVGElement, groupFlows:SVGSVGElement, nodes: Map<string, Node>, flows: Flow[], config:SankeyConfig, width:number, height:number, maxX:number, maxY:number, clear:boolean=false) {
    if (clear) {
        groupNodes.innerHTML = ''
        groupFlows.innerHTML = ''
    }

    const scaleX = config.scaleX
    const scaleY = config.scaleY

    // Nodes
    for (const node of nodes.values()) {
        //rect
        if (node.width > 0 && node.size_>0) {
            const tooltip = typeof node.tooltip === 'function' ? node.tooltip(node) : (node.tooltip === null ? null : node.tooltip || `${node.label.text || ''} (${node.size})`);
            const rect = createElement('rect', {
                id: `node-${node.idClean}`,
                x: node.x_,
                y: node.y_,
                width: node.width,
                height: node.size_,
                class: classNamesForColumn(node, maxX, 'node', node.className),
                'data-tooltip': tooltip
            })
            groupNodes.appendChild(rect);
        }

        //position label
        const labelGroup = svg.getElementById(`label-node-${node.idClean}`)
        if(!labelGroup) continue
        /*
        let y = Math.min(
            Math.max(
                0, //not above viewport
                node.y_ + node.size_ / 2 - node.label.height/2 - config.fontsize*0.3), //normal y value
            maxY*scaleY-node.label.height-config.fontsize*0.7 //not below viewport
        )
        */
        let y = node.y_ + node.size_ / 2 - node.label.height/2 - config.fontsize*0.3
        let x
        if (node.label.position === 'left') {
            x = node.x_ - node.label.width
        } else if (node.label.position === 'right') {
            x = node.x_ + node.width
        } else {
            x = node.x_ + node.width / 2 - node.label.width/2
        }
        labelGroup.setAttribute('transform', `translate(${x}, ${y})`);
    }

    // Flows
    for (const flow of flows) {
        const classNames = [flow.className]
        if(flow.value === 0) {
            classNames.push('flowvalue-zero')
        }
        const tooltip = typeof flow.tooltip === 'function' ? flow.tooltip(flow) : (flow.tooltip === null ? null : flow.tooltip || `${nodes.get(flow.from).label.text} &rarr; ${nodes.get(flow.to).label.text}: ${flow.value}`)
        const path = createElement('path', {
            id: `flow-${flow.idClean}`,
            class: classNames.join(' '),
            d: generateFlowPath(nodes, flow, scaleX, scaleY),
            'data-tooltip': tooltip
        })
        groupFlows.appendChild(path);
    }
}

function classNamesForColumn(node:Node, maxX:number, label:string, extra:string|null=null): string {
    let classes = [`${label}-column-${node.x}`]
    if (node.x === maxX) {
        classes.push(`${label}-column-last`)
    } else if (node.x !== 0) {
        classes.push(`${label}-column-middle`)
    }
    if (extra) {
        classes.push(extra)
    }
    return classes.join(' ')
}
