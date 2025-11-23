import {Flow} from "../models/Flow";
import {Node} from "../models/Node";

type Point = { x: number; y: number };

export function generateFlowPath(nodeMap:Map<string, Node>, flow:Flow, scaleX:number, scaleY:number): string {

    const fromNode = nodeMap.get(flow.from);
    const toNode = nodeMap.get(flow.to);
    const flowMidValue = flow.value / 2;
    const halfThickness = flowMidValue * scaleY;

    const fromY = fromNode.y_ + (flowMidValue + flow.yOffsetFrom) * scaleY;
    const toY = toNode.y_ + (flowMidValue + flow.yOffsetTo) * scaleY;

    const startX = fromNode.x_ + fromNode.width;
    const endX = toNode.x_;

    if (flow.render === 'b') {
        return generateBezierPath(endX, toY, startX, fromY, halfThickness);
    } else {
        return generateTillerHansonPath(
            { x: startX, y: fromY },
            { x: startX + scaleX / 2, y: fromY },
            { x: endX - scaleX / 2, y: toY },
            { x: endX, y: toY },
            halfThickness
        );
    }
}

// Generates SVG path string for bezier
function generateBezierPath(x1:number, y1:number, x2:number, y2:number, halfThickness:number) {
    const dx = x2 - x1;
    const controlOffset = dx / 3;

    const topStart = { x: x1, y: y1 - halfThickness };
    const topEnd = { x: x2, y: y2 - halfThickness };
    const bottomStart = { x: x2, y: y2 + halfThickness };
    const bottomEnd = { x: x1, y: y1 + halfThickness };

    const topCtrl1 = { x: x1 + controlOffset, y: topStart.y };
    const topCtrl2 = { x: x2 - controlOffset, y: topEnd.y };
    const bottomCtrl1 = { x: topCtrl2.x, y: bottomStart.y };
    const bottomCtrl2 = { x: topCtrl1.x, y: bottomEnd.y };

    return `` +
        `M ${topStart.x},${topStart.y}` +
        `C ${topCtrl1.x},${topCtrl1.y} ${topCtrl2.x},${topCtrl2.y} ${topEnd.x},${topEnd.y}` +
        `L ${bottomStart.x},${bottomStart.y}` +
        `C ${bottomCtrl1.x},${bottomCtrl1.y} ${bottomCtrl2.x},${bottomCtrl2.y} ${bottomEnd.x},${bottomEnd.y}` +
        `Z`
}

// Generates SVG path string for bezier with Tiller-Hanson approach
export function generateTillerHansonPath(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    halfThickness: number,
    steps = 30
): string {
    const left: Point[] = [];
    const right: Point[] = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = getCubicBezierPoint(t, p0, p1, p2, p3);
        const normal = getNormalizedNormalOfTangent(t, p0, p1, p2, p3);

        left.push(offsetPoint(pt, normal, halfThickness));
        right.unshift(offsetPoint(pt, normal, -halfThickness));
    }

    const pathCommands = [];

    // Start at left[0]
    pathCommands.push(`M ${left[0].x},${left[0].y}`);

    // Left side curve
    for (let i = 1; i < left.length; i++) {
        pathCommands.push(`L ${left[i].x},${left[i].y}`);
    }

    // Right side curve
    for (let i = 0; i < right.length; i++) {
        pathCommands.push(`L ${right[i].x},${right[i].y}`);
    }

    pathCommands.push("Z"); // Close the path
    return pathCommands.join(" ");
}

// Bezier math helpers
function getCubicBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const mt = 1 - t;
    return {
        x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
        y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
    };
}

function getNormalizedNormalOfTangent(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    // get tangent
    const mt = 1 - t;
    const tangent =  {
        x: 3 * mt ** 2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
        y: 3 * mt ** 2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y),
    };

    // get normal
    const p = { x: -tangent.y, y: tangent.x };

    // normalize
    const len = Math.sqrt(p.x * p.x + p.y * p.y);
    return len === 0 ? { x: 0, y: 0 } : { x: p.x / len, y: p.y / len };

}

function offsetPoint(p: Point, normal: Point, width: number): Point {
    return {
        x: p.x + normal.x * width,
        y: p.y + normal.y * width,
    };
}
