import { Node } from "../models/Node"
import { Flow } from "../models/Flow"
import { generateFlowPath } from "../render/bezier"

let svg: SVGSVGElement
let selected: SVGRectElement | null = null
let selectedLabel: Element
const selectedFlows: { element: Element; flow: Flow }[] = []
let node: Node
let offsetNode: { x: number; y: number }
let offsetLabel: { x: number; y: number }

const getMousePosition = (event: MouseEvent) => {
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    return { x: cursor.x, y: cursor.y }
}

export function drag(
    svgEl: SVGSVGElement,
    nodeMap: Map<string, Node>,
    scaleX: number,
    scaleY: number,
    groupFlows: SVGGElement,
) {
    svg = svgEl
    const nodeElements = svg.querySelectorAll<SVGRectElement>("rect[id^='node-']")

    for (const rect of nodeElements) {
        rect.addEventListener("mousedown", (event) => {
            event.preventDefault()
            selected = rect

            //get offset
            const mousePos = getMousePosition(event)
            const rectX = Number(rect.getAttribute("x"))
            const rectY = Number(rect.getAttribute("y"))
            offsetNode = { x: mousePos.x - rectX, y: mousePos.y - rectY }

            //get node object
            const nodeId = selected.getAttribute("id")
            node = [...nodeMap.values()].find((n) => n.idClean === nodeId.replace("node-", ""))

            //get label element
            selectedLabel = svg.getElementById(`label-${nodeId}`)
            if (selectedLabel) {
                const labelXY = selectedLabel
                    .getAttribute("transform")
                    .slice(10, -1)
                    .split(",")
                    .map(parseFloat)
                offsetLabel = {
                    x: mousePos.x - labelXY[0],
                    y: mousePos.y - labelXY[1],
                }
            }

            //get flow elements
            for (const flow of node.in.concat(node.out)) {
                const element = svg.getElementById(`flow-${flow.idClean}`)
                if (element) {
                    selectedFlows.push({
                        element: svg.getElementById(`flow-${flow.idClean}`),
                        flow,
                    })
                    //move element to bottom, so it is rendered on top of other flows
                    groupFlows.appendChild(element)
                }
            }
        })
    }

    document.addEventListener("mousemove", (event) => {
        if (!selected) return
        const { x, y } = getMousePosition(event)

        //update node object
        node.x_ = x - offsetNode.x
        node.y_ = y - offsetNode.y

        //move node element
        selected.setAttribute("x", String(x - offsetNode.x))
        selected.setAttribute("y", String(y - offsetNode.y))

        //move label element
        if (selectedLabel) {
            selectedLabel.setAttribute(
                "transform",
                `translate(${x - offsetLabel.x}, ${y - offsetLabel.y})`,
            )
        }

        //adjust flows
        for (const f of selectedFlows) {
            f.element.setAttribute("d", generateFlowPath(nodeMap, f.flow, scaleX, scaleY))
        }
    })

    document.addEventListener("mouseup", () => {
        selected = null
    })
}
