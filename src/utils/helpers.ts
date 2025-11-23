import {Node} from "../models/Node";
import {Flow} from "../models/Flow";
import {SankeyConfig} from "../Sankey";

export const cleanString = (s) => {
    return s.replaceAll(/[^\w\d]+/g, '')
}

export function enrichData(config:SankeyConfig): {nodes:Map<string, Node>, flows:Flow[]} {

    const {flows, nodeConfig= {}, nodeBaseConfig = {}, flowBaseConfig = {}} = config;
    const nodeIds = new Set<string>();
    flows.forEach(flow => {
        Object.assign(flow, flowBaseConfig, flow);
        flow.value = Number(flow.value||0)
        flow.idClean = `${cleanString(flow.from)}-${cleanString(flow.to)}`
        nodeIds.add(flow.from);
        nodeIds.add(flow.to);
    });

    const nodes = new Map()
    for (const id of nodeIds) {
        const node = {
            id,
            idClean: cleanString(id),
            in: [],
            out: [],
            ...nodeBaseConfig,
            ...nodeConfig[id],
            label: {
                ...nodeBaseConfig?.label,
                ...nodeConfig[id]?.label
            }
        };
        nodes.set(id, node);
    }

    for (const flow of flows) {
        nodes.get(flow.from).out.push(flow);
        nodes.get(flow.to).in.push(flow);
    }

    for(const node of nodes.values()) {
        node.size = Math.max(
            node.in.reduce((a, i) => a + i.value, 0),
            node.out.reduce((a, i) => a + i.value, 0),
        )
        node.label.text = typeof node.label.text === 'function' ? node.label.text(node) : (node.label.text === null ? null : node.label.text || node.id);
    }

    return { nodes, flows }
}