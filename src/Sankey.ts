import { Flow } from './models/Flow';
import { Node } from './models/Node';
import {
    calculateNodeXPosition,
    calculateNodeYPosition,
    addPadding,
    sortFlows,
    nodeLabelSpaceAllocation
} from './utils/layout';
import {createSVG, renderLabels, renderNodesFlows, scaling, styling} from './render/renderSVG';
import {finalizeTooltips, makeTooltip} from "./render/tooltip";
import {enrichData} from "./utils/helpers";
import {drag} from "./utils/drag";

export interface SankeyConfig {
    id: string;
    flows: Flow[];
    nodeConfig?: Record<string, Partial<Node>>;
    nodeBaseConfig?: Partial<Node>;
    flowBaseConfig?: Partial<Flow>;
    padding: number;
    margin: number[];
    labelPadding: number;
    fontsize: number;
    labelSpaceLeft: number;
    labelSpaceRight: number;
    scaleX: number;
    scaleY: number;
}

export class Sankey {
    private nodes: Map<string, Node>
    private flows: Flow[]
    private readonly maxX:number
    private readonly maxY:number
    private readonly height: number
    private readonly width: number
    private readonly maxNodeWidth: Map<number, number>
    private readonly container:HTMLElement

    constructor(
        private containerId: string,
        private config: SankeyConfig
    ) {
        this.config.id = this.config.id ?? `${containerId}_`
        this.config.padding ??= 20
        this.config.labelPadding ??= 4
        this.config.fontsize ??= 12
        this.config.labelSpaceLeft ??= 0
        this.config.labelSpaceRight ??= 0
        this.config.margin ??= [0,0,0,0]
        this.config.nodeBaseConfig ??= {}
        this.config.nodeBaseConfig.width ??= 20
        this.config.flowBaseConfig ??= {}
        this.config.flowBaseConfig.render ??= 'b' // 'b' | 'th'

        //get container
        this.container = document.getElementById(containerId);
        this.container.innerHTML = '';
        this.height = this.container.offsetHeight || 500
        this.width = this.container.offsetWidth || 500

        //setup svg
        const {svg, groupNodes, groupFlows, groupLabels} = createSVG(this.config, this.width, this.height)
        this.container.appendChild(svg)

        //setup tooltip div element
        makeTooltip(containerId, this.config)

        //clean up config, extract nodes and flows
        const {nodes, flows} = enrichData(this.config)
        this.nodes = nodes
        this.flows = flows

        //node x position
        this.maxX = calculateNodeXPosition(this.nodes, this.flows);

        //node y position
        this.maxY = calculateNodeYPosition(this.nodes, this.maxX, this.config);
        const padding = (this.maxY / this.height) * this.config.padding
        this.maxY = addPadding(this.nodes, padding, this.maxX);

        //sort flows
        sortFlows(this.nodes)

        //render node labels
        renderLabels(groupLabels, this.nodes, this.config, this.maxX)
        this.maxNodeWidth = nodeLabelSpaceAllocation(this.nodes, this.config, this.maxX)

        //render nodes and flows
        styling(svg, this.nodes, this.flows, this.config)
        scaling(this.nodes, this.flows, this.config, this.width, this.height, this.maxX, this.maxY, this.maxNodeWidth)
        renderNodesFlows(svg, groupNodes, groupFlows, this.nodes, this.flows, this.config, this.width, this.height, this.maxX, this.maxY);

        //tooltips
        finalizeTooltips()

        drag(svg, this.nodes, config.scaleX, config.scaleY, groupFlows)
    }

}