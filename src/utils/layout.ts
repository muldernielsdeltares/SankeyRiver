import { Node } from '../models/Node';
import { Flow } from '../models/Flow';
import {SankeyConfig} from "../Sankey";

export function calculateNodeXPosition(nodeMap: Map<string, Node>, data: Flow[]): number {
    const idsPlace = new Set(nodeMap.keys());
    let x = 0;

    while (idsPlace.size) {
        const column: string[] = [];

        for (const id of idsPlace) {
            const node = nodeMap.get(id)!;
            const allIn = node.in.map(flow => flow.from);
            if (allIn.every(id => nodeMap.get(id).x !== undefined)) {
                column.push(id);
            }
        }

        for (const id of column) {
            const node = nodeMap.get(id)!;
            node.x = node.column || x;
            idsPlace.delete(id);
        }

        x++;
    }

    let maxX = x-1

    // Move nodes that have no output to the right edge of the flow
    const ids = [...nodeMap.keys()]
    const from = new Set(data.map((flow) => flow.from))
    ids.filter((id) => !from.has(id)).forEach((id) => {
        const node = nodeMap.get(id)
        node.x = node.column || maxX
        maxX = Math.max(maxX, node.x)
    })

    return maxX
}

export function calculateNodeYPosition(nodes:Map<string, Node>, maxX:number, config) {
    let maxY = 0
    const nodesSorted = [...nodes.values()].sort((a, b) => (a.sorting ?? 0) - (b.sorting ?? 0))
    for (let x = 0; x <= maxX; x++) {
        let y = 0
        const nodesArray = nodesSorted.filter((node) => node.x === x)
        for (const node of nodesArray) {

            const relativeToId = node.relativeTo?.id;
            let relativeTo = relativeToId ? nodes.get(relativeToId) : null;
            if (!relativeTo || typeof relativeTo.y === 'undefined') {
                relativeTo = null
            }
            if (relativeTo) {
                node.y = relativeTo.y +
                    (node.relativeTo.y1 ?? 0) * relativeTo.size +
                    (node.relativeTo.y2 ?? 0) * node.size
            } else {
                node.y = y
            }
            y = node.y + node.size
        }
        maxY = Math.max(y, maxY)
    }
    return maxY
}

export function sortFlows(nodes: Map<string, Node>) {
    for (const node of nodes.values()) {
        //const nodeSize = node.size
        //const overlapFrom = nodeSize < node.in
        //const overlapTo = nodeSize < node.out
        let offset = 0
        //let len = node.in.length
        node.in
            .sort((a, b) => nodes.get(a.from).y - nodes.get(b.from).y)
            .forEach((flow, i) => {
                //if (overlapFrom) {
                //    flow.yOffsetFrom = (idx * (nodeSize - flow.value)) / (len - 1)
                //}
                //else {
                    flow.yOffsetTo = offset
                    offset += flow.value
                //}
            })
        offset = 0
        //len = node.out.length
        node.out
            .sort((a, b) => nodes.get(a.to).y - nodes.get(b.to).y)
            .forEach((flow, i) => {
                //if (overlapTo) {
                //    flow.yOffsetTo = (idx * (nodeSize - flow.value)) / (len - 1)
                //}
                //else {
                    flow.yOffsetFrom = offset
                    offset += flow.value
                //}
            })
    }
}
export function addPadding(nodes:Map<string, Node>, padding:number, maxX:number) {
    let maxY = 0
    let minY = 0
    const nodesSorted = [...nodes.values()].sort((a, b) => a.y - b.y)
    for (let x = 0; x <= maxX; x++) {
        let paddings = 0
        const nodes = nodesSorted.filter((node) => node.x === x)
        for (const node of nodes) {
            if(node.relativeTo) {
                paddings = 0
            }
            if (node.paddings) {
                paddings = node.paddings
            }
            node.y += paddings * padding
            paddings += 1
            maxY = Math.max(maxY, node.y + node.size)
            minY = Math.min(minY, <number>node.y)
        }
    }
    if (minY<0) {
        for (const node of nodes.values()) {
            node.y -= minY
        }
    }
    return maxY-minY
}

export function nodeLabelSpaceAllocation(nodes:Map<string, Node>, config:SankeyConfig, maxX:number) {
    const maxNodeWidth = new Map<number, number>();

    for (const node of nodes.values()) {
        const x = node.x;
        // Update max width per x
        maxNodeWidth.set(x, Math.max(maxNodeWidth.get(x) ?? 0, node.width));

        // Determine default label position
        let position = node.label.position;
        if (!node.label.position) {
            position =
                x === 0 ? 'left' :
                    x === maxX ? 'right' :
                        'center';
            node.label.position = position;
        }

        // Update label space
        if (x === 0 && position !== 'right') {
            const left = <number>(position === 'center' ? node.label.width*0.5 - node.width/2 : node.label.width)
            config.labelSpaceLeft = Math.max(
                config.labelSpaceLeft ?? 0,
                left
            );
        } else if (x === maxX && position !== 'left') {
            const right = <number>(position === 'center' ? node.label.width*0.5 - node.width/2 : node.label.width)
            config.labelSpaceRight = Math.max(
                config.labelSpaceRight ?? 0,
                right
            );
        }
    }

    return maxNodeWidth
}
