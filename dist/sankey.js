// src/utils/layout.ts
function calculateNodeXPosition(nodeMap, data) {
  const idsPlace = new Set(nodeMap.keys());
  let x = 0;
  while (idsPlace.size) {
    const column = [];
    for (const id of idsPlace) {
      const node2 = nodeMap.get(id);
      const allIn = node2.in.map((flow) => flow.from);
      if (allIn.every((id2) => nodeMap.get(id2).x !== void 0)) {
        column.push(id);
      }
    }
    for (const id of column) {
      const node2 = nodeMap.get(id);
      node2.x = node2.column || x;
      idsPlace.delete(id);
    }
    x++;
  }
  let maxX = x - 1;
  const ids = [...nodeMap.keys()];
  const from = new Set(data.map((flow) => flow.from));
  ids.filter((id) => !from.has(id)).forEach((id) => {
    const node2 = nodeMap.get(id);
    node2.x = node2.column || maxX;
    maxX = Math.max(maxX, node2.x);
  });
  return maxX;
}
function calculateNodeYPosition(nodes, maxX) {
  let maxY = 0;
  const nodesSorted = [...nodes.values()].sort((a, b) => (a.sorting ?? 0) - (b.sorting ?? 0));
  for (let x = 0; x <= maxX; x++) {
    let y = 0;
    const nodesArray = nodesSorted.filter((node2) => node2.x === x);
    for (const node2 of nodesArray) {
      const relativeToId = node2.relativeTo?.id;
      let relativeTo = relativeToId ? nodes.get(relativeToId) : null;
      if (!relativeTo || typeof relativeTo.y === "undefined") {
        relativeTo = null;
      }
      if (relativeTo && node2.relativeTo) {
        node2.y = relativeTo.y + (node2.relativeTo.y1 ?? 0) * relativeTo.size + (node2.relativeTo.y2 ?? 0) * node2.size;
      } else {
        node2.y = y;
      }
      y = node2.y + node2.size;
    }
    maxY = Math.max(y, maxY);
  }
  return maxY;
}
function sortFlows(nodes) {
  for (const node2 of nodes.values()) {
    let offset = 0;
    node2.in.sort((a, b) => nodes.get(a.from).y - nodes.get(b.from).y).forEach((flow) => {
      flow.yOffsetTo = offset;
      offset += flow.value;
    });
    offset = 0;
    node2.out.sort((a, b) => nodes.get(a.to).y - nodes.get(b.to).y).forEach((flow) => {
      flow.yOffsetFrom = offset;
      offset += flow.value;
    });
  }
}
function addPadding(nodes, padding, maxX) {
  let maxY = 0;
  let minY = 0;
  const nodesSorted = [...nodes.values()].sort((a, b) => a.y - b.y);
  for (let x = 0; x <= maxX; x++) {
    let paddings = 0;
    const nodes2 = nodesSorted.filter((node2) => node2.x === x);
    for (const node2 of nodes2) {
      if (node2.relativeTo) {
        paddings = 0;
      }
      if (node2.paddings) {
        paddings = node2.paddings;
      }
      node2.y += paddings * padding;
      paddings += 1;
      maxY = Math.max(maxY, node2.y + node2.size);
      minY = Math.min(minY, node2.y);
    }
  }
  if (minY < 0) {
    for (const node2 of nodes.values()) {
      node2.y -= minY;
    }
  }
  return maxY - minY;
}
function nodeLabelSpaceAllocation(nodes, config, maxX) {
  const maxNodeWidth = /* @__PURE__ */ new Map();
  for (const node2 of nodes.values()) {
    const x = node2.x;
    maxNodeWidth.set(x, Math.max(maxNodeWidth.get(x) ?? 0, node2.width));
    let position = node2.label.position;
    if (!node2.label.position) {
      position = x === 0 ? "left" : x === maxX ? "right" : "center";
      node2.label.position = position;
    }
    if (x === 0 && position !== "right") {
      const left = position === "center" ? node2.label.width * 0.5 - node2.width / 2 : node2.label.width;
      config.labelSpaceLeft = Math.max(
        config.labelSpaceLeft ?? 0,
        left
      );
    } else if (x === maxX && position !== "left") {
      const right = position === "center" ? node2.label.width * 0.5 - node2.width / 2 : node2.label.width;
      config.labelSpaceRight = Math.max(
        config.labelSpaceRight ?? 0,
        right
      );
    }
  }
  return maxNodeWidth;
}

// src/render/styles.ts
function generateBaseStyles(config) {
  return `rect[id^='node-']{fill:#777}
path[id^='flow-']{opacity:0.6;fill:#ddd;&:hover{opacity:1}}
path.flowvalue-zero{stroke:#ddd;stroke-width:1}
g[id^='label-node']{pointer-events:none;rect{fill:#fff}}
*{font-size:${config.fontsize}pt}`;
}
function generateStyles(nodeMap, flows) {
  let styles = "";
  for (const node2 of nodeMap.values()) {
    const styleStr = objectToCSS(node2.style);
    if (styleStr) {
      styles += `#node-${node2.idClean} { ${styleStr} }
`;
    }
  }
  for (const flow of flows) {
    const styleStr = objectToCSS(flow.style);
    if (styleStr) {
      styles += `#flow-${flow.idClean} { ${styleStr} }
`;
    }
  }
  return styles;
}
function objectToCSS(style) {
  if (!style) return;
  return Object.entries(style).map(([k, v]) => `${k}:${v};`).join(" ");
}

// src/render/bezier.ts
function generateFlowPath(nodeMap, flow, scaleX, scaleY) {
  const fromNode = nodeMap.get(flow.from);
  const toNode = nodeMap.get(flow.to);
  const flowMidValue = flow.value / 2;
  const halfThickness = flowMidValue * scaleY;
  const fromY = fromNode.y_ + (flowMidValue + flow.yOffsetFrom) * scaleY;
  const toY = toNode.y_ + (flowMidValue + flow.yOffsetTo) * scaleY;
  const startX = fromNode.x_ + fromNode.width;
  const endX = toNode.x_;
  if (flow.render === "b") {
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
function generateBezierPath(x1, y1, x2, y2, halfThickness) {
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
  return `M ${topStart.x},${topStart.y}C ${topCtrl1.x},${topCtrl1.y} ${topCtrl2.x},${topCtrl2.y} ${topEnd.x},${topEnd.y}L ${bottomStart.x},${bottomStart.y}C ${bottomCtrl1.x},${bottomCtrl1.y} ${bottomCtrl2.x},${bottomCtrl2.y} ${bottomEnd.x},${bottomEnd.y}Z`;
}
function generateTillerHansonPath(p0, p1, p2, p3, halfThickness, steps = 30) {
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = getCubicBezierPoint(t, p0, p1, p2, p3);
    const normal = getNormalizedNormalOfTangent(t, p0, p1, p2, p3);
    left.push(offsetPoint(pt, normal, halfThickness));
    right.unshift(offsetPoint(pt, normal, -halfThickness));
  }
  const pathCommands = [];
  pathCommands.push(`M ${left[0].x},${left[0].y}`);
  for (let i = 1; i < left.length; i++) {
    pathCommands.push(`L ${left[i].x},${left[i].y}`);
  }
  for (let i = 0; i < right.length; i++) {
    pathCommands.push(`L ${right[i].x},${right[i].y}`);
  }
  pathCommands.push("Z");
  return pathCommands.join(" ");
}
function getCubicBezierPoint(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y
  };
}
function getNormalizedNormalOfTangent(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  const tangent = {
    x: 3 * mt ** 2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
    y: 3 * mt ** 2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y)
  };
  const p = { x: -tangent.y, y: tangent.x };
  const len = Math.sqrt(p.x * p.x + p.y * p.y);
  return len === 0 ? { x: 0, y: 0 } : { x: p.x / len, y: p.y / len };
}
function offsetPoint(p, normal, width) {
  return {
    x: p.x + normal.x * width,
    y: p.y + normal.y * width
  };
}

// src/render/renderSVG.ts
var svgNS = "http://www.w3.org/2000/svg";
var createElement = (qualifiedName, attributes) => {
  const el = document.createElementNS(svgNS, qualifiedName);
  Object.entries(attributes).forEach(
    ([k, v]) => {
      if (v) {
        el.setAttribute(k, String(v));
      }
    }
  );
  return el;
};
function createSVG(config, width, height) {
  const svg2 = createElement("svg", {
    width,
    height,
    id: config.id
  });
  const groupNodes = createElement("g", { id: "nodes" });
  svg2.appendChild(groupNodes);
  const groupFlows = createElement("g", { id: "flows" });
  svg2.appendChild(groupFlows);
  const groupLabels = createElement("g", { id: "labels" });
  svg2.appendChild(groupLabels);
  return { svg: svg2, groupNodes, groupFlows, groupLabels };
}
function renderLabels(svg2, nodes, config, maxX) {
  for (const node2 of nodes.values()) {
    if (!node2.label.text) {
      node2.label.width = 0;
      node2.label.height = 0;
      continue;
    }
    const group = createElement("g", {
      id: `label-node-${node2.idClean}`,
      class: classNamesForColumn(node2, maxX, "label")
    });
    svg2.appendChild(group);
    const text = createElement("text", {
      "font-size": `${config.fontsize}pt`
    });
    group.appendChild(text);
    if (typeof node2.label.text === "string") {
      const lines = node2.label.text.split("\n");
      for (const line of lines) {
        const tspan = createElement("tspan", {
          x: config.labelPadding,
          dy: "1.2em",
          "font-size": `${config.fontsize}pt`
        });
        tspan.textContent = line;
        text.appendChild(tspan);
      }
    }
    const bbox = text.getBBox();
    node2.label.width = bbox.width + 2 * config.labelPadding;
    node2.label.height = bbox.height + 2 * config.labelPadding;
    const rect = createElement("rect", {
      width: node2.label.width,
      height: node2.label.height,
      "font-size": `${config.fontsize}pt`
    });
    group.insertBefore(rect, text);
  }
}
function styling(svg2, nodes, flows, config) {
  const styleTag = document.createElementNS(svgNS, "style");
  styleTag.textContent = `svg#${config.id}{
${generateBaseStyles(config)}
${generateStyles(nodes, flows)}}`;
  svg2.appendChild(styleTag);
}
function scaling(nodes, flows, config, width, height, maxX, maxY, maxNodeWidth) {
  const labelSpace = config.labelSpaceLeft + config.labelSpaceRight;
  const scaleX = (width - labelSpace - maxNodeWidth.get(maxX) - config.margin[1] - config.margin[3]) / maxX;
  const scaleY = (height - config.margin[0] - config.margin[2]) / maxY;
  config.scaleX = scaleX;
  config.scaleY = scaleY;
  for (const node2 of nodes.values()) {
    const shift = node2.x === 0 ? 0 : (maxNodeWidth.get(node2.x) - node2.width) / (node2.x === maxX ? 1 : 2);
    node2.x_ = node2.x * scaleX + config.labelSpaceLeft + shift + config.margin[1];
    node2.y_ = node2.y * scaleY + config.margin[0];
    node2.size_ = node2.size * scaleY;
  }
}
function renderNodesFlows(svg2, groupNodes, groupFlows, nodes, flows, config, width, height, maxX, maxY, clear = false) {
  if (clear) {
    groupNodes.innerHTML = "";
    groupFlows.innerHTML = "";
  }
  const scaleX = config.scaleX;
  const scaleY = config.scaleY;
  for (const node2 of nodes.values()) {
    if (node2.width > 0 && node2.size_ > 0) {
      const tooltip = typeof node2.tooltip === "function" ? node2.tooltip(node2) : node2.tooltip === null ? null : node2.tooltip || `${node2.label.text || ""} (${node2.size})`;
      const rect = createElement("rect", {
        id: `node-${node2.idClean}`,
        x: node2.x_,
        y: node2.y_,
        width: node2.width,
        height: node2.size_,
        class: classNamesForColumn(node2, maxX, "node", node2.className),
        "data-tooltip": tooltip
      });
      groupNodes.appendChild(rect);
    }
    const labelGroup = svg2.getElementById(`label-node-${node2.idClean}`);
    if (!labelGroup) continue;
    const y = node2.y_ + node2.size_ / 2 - node2.label.height / 2 - config.fontsize * 0.3;
    let x;
    if (node2.label.position === "left") {
      x = node2.x_ - node2.label.width;
    } else if (node2.label.position === "right") {
      x = node2.x_ + node2.width;
    } else {
      x = node2.x_ + node2.width / 2 - node2.label.width / 2;
    }
    labelGroup.setAttribute("transform", `translate(${x}, ${y})`);
  }
  for (const flow of flows) {
    const classNames = [flow.className];
    if (flow.value === 0) {
      classNames.push("flowvalue-zero");
    }
    const tooltip = typeof flow.tooltip === "function" ? flow.tooltip(flow) : flow.tooltip === null ? null : flow.tooltip || `${nodes.get(flow.from).label.text} &rarr; ${nodes.get(flow.to).label.text}: ${flow.value}`;
    const path = createElement("path", {
      id: `flow-${flow.idClean}`,
      class: classNames.join(" "),
      d: generateFlowPath(nodes, flow, scaleX, scaleY),
      "data-tooltip": tooltip
    });
    groupFlows.appendChild(path);
  }
}
function classNamesForColumn(node2, maxX, label, extra = null) {
  const classes = [`${label}-column-${node2.x}`];
  if (node2.x === maxX) {
    classes.push(`${label}-column-last`);
  } else if (node2.x !== 0) {
    classes.push(`${label}-column-middle`);
  }
  if (extra) {
    classes.push(extra);
  }
  return classes.join(" ");
}

// src/render/tooltip.ts
var tooltipId = "";
var tooltipRect;
var viewportWidth = window.innerWidth;
var viewportHeight = window.innerHeight;
function makeTooltip(containerId, config) {
  const el = document.createElement("div");
  tooltipId = `${containerId}-tooltip`;
  el.setAttribute("id", tooltipId);
  el.setAttribute("style", `font-size:${config.fontsize}pt;background:#000;border-radius:5px;padding:5px;color:#fff;position:absolute;display:none;`);
  document.body.appendChild(el);
}
function finalizeTooltips() {
  document.querySelectorAll("[data-tooltip]").forEach((el) => {
    const text = el.getAttribute("data-tooltip");
    if (text) {
      el.addEventListener("mouseenter", openTooltip(text));
      el.addEventListener("mousemove", moveTooltip());
      el.addEventListener("mouseleave", closeTooltip());
    }
  });
}
function getTooltip() {
  return document.getElementById(tooltipId);
}
function openTooltip(text) {
  return () => {
    const tooltip = getTooltip();
    tooltip.innerHTML = text;
    tooltip.style.display = "block";
    tooltipRect = tooltip.getBoundingClientRect();
  };
}
function moveTooltip() {
  return (event) => {
    const tooltip = getTooltip();
    tooltipRect = tooltip.getBoundingClientRect();
    let x = event.clientX + window.scrollX + 10;
    let y = event.clientY + window.scrollY + 10;
    if (event.clientX + tooltipRect.width + 20 > viewportWidth) {
      x = event.clientX + window.scrollX - tooltipRect.width - 10;
    }
    if (event.clientY + tooltipRect.height + 20 > viewportHeight) {
      y = event.clientY + window.scrollY - tooltipRect.height - 10;
    }
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  };
}
function closeTooltip() {
  return function() {
    const tooltip = getTooltip();
    tooltip.style.display = "none";
  };
}

// src/utils/helpers.ts
var cleanString = (s) => {
  return s.replaceAll(/[^\w\d]+/g, "");
};
function enrichData(config) {
  const { flows, nodeConfig = {}, nodeBaseConfig = {}, flowBaseConfig = {} } = config;
  const nodeIds = /* @__PURE__ */ new Set();
  flows.forEach((flow) => {
    Object.assign(flow, flowBaseConfig, flow);
    flow.value = Number(flow.value || 0);
    flow.idClean = `${cleanString(flow.from)}-${cleanString(flow.to)}`;
    nodeIds.add(flow.from);
    nodeIds.add(flow.to);
  });
  const nodes = /* @__PURE__ */ new Map();
  for (const id of nodeIds) {
    const node2 = {
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
    nodes.set(id, node2);
  }
  for (const flow of flows) {
    nodes.get(flow.from).out.push(flow);
    nodes.get(flow.to).in.push(flow);
  }
  for (const node2 of nodes.values()) {
    node2.size = Math.max(
      node2.in.reduce((a, i) => a + i.value, 0),
      node2.out.reduce((a, i) => a + i.value, 0)
    );
    node2.label.text = typeof node2.label.text === "function" ? node2.label.text(node2) : node2.label.text === null ? null : node2.label.text || node2.id;
  }
  return { nodes, flows };
}

// src/utils/drag.ts
var svg;
var selected = null;
var selectedLabel;
var selectedFlows = [];
var node;
var offsetNode;
var offsetLabel;
var getMousePosition = (event) => {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return { x: cursor.x, y: cursor.y };
};
function drag(svgEl, nodeMap, scaleX, scaleY, groupFlows) {
  svg = svgEl;
  const nodeElements = svg.querySelectorAll("rect[id^='node-']");
  for (const rect of nodeElements) {
    rect.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selected = rect;
      const mousePos = getMousePosition(event);
      const rectX = Number(rect.getAttribute("x"));
      const rectY = Number(rect.getAttribute("y"));
      offsetNode = { x: mousePos.x - rectX, y: mousePos.y - rectY };
      const nodeId = selected.getAttribute("id");
      node = [...nodeMap.values()].find((n) => n.idClean === nodeId.replace("node-", ""));
      selectedLabel = svg.getElementById(`label-${nodeId}`);
      if (selectedLabel) {
        const labelXY = selectedLabel.getAttribute("transform").slice(10, -1).split(",").map(parseFloat);
        offsetLabel = { x: mousePos.x - labelXY[0], y: mousePos.y - labelXY[1] };
      }
      for (const flow of node.in.concat(node.out)) {
        const element = svg.getElementById(`flow-${flow.idClean}`);
        if (element) {
          selectedFlows.push({
            element: svg.getElementById(`flow-${flow.idClean}`),
            flow
          });
          groupFlows.appendChild(element);
        }
      }
    });
  }
  document.addEventListener("mousemove", (event) => {
    if (!selected) return;
    const { x, y } = getMousePosition(event);
    node.x_ = x - offsetNode.x;
    node.y_ = y - offsetNode.y;
    selected.setAttribute("x", String(x - offsetNode.x));
    selected.setAttribute("y", String(y - offsetNode.y));
    if (selectedLabel) {
      selectedLabel.setAttribute("transform", `translate(${x - offsetLabel.x}, ${y - offsetLabel.y})`);
    }
    for (const f of selectedFlows) {
      f.element.setAttribute("d", generateFlowPath(nodeMap, f.flow, scaleX, scaleY));
    }
  });
  document.addEventListener("mouseup", () => {
    selected = null;
  });
}

// src/Sankey.ts
var Sankey = class {
  constructor(containerId, config) {
    this.containerId = containerId;
    this.config = config;
    this.config.id = this.config.id ?? `${containerId}_`;
    this.config.padding ??= 20;
    this.config.labelPadding ??= 4;
    this.config.fontsize ??= 12;
    this.config.labelSpaceLeft ??= 0;
    this.config.labelSpaceRight ??= 0;
    this.config.margin ??= [0, 0, 0, 0];
    this.config.nodeBaseConfig ??= {};
    this.config.nodeBaseConfig.width ??= 20;
    this.config.flowBaseConfig ??= {};
    this.config.flowBaseConfig.render ??= "b";
    this.container = document.getElementById(containerId);
    this.container.innerHTML = "";
    this.height = this.container.offsetHeight || 500;
    this.width = this.container.offsetWidth || 500;
    const { svg: svg2, groupNodes, groupFlows, groupLabels } = createSVG(this.config, this.width, this.height);
    this.container.appendChild(svg2);
    makeTooltip(containerId, this.config);
    const { nodes, flows } = enrichData(this.config);
    this.nodes = nodes;
    this.flows = flows;
    this.maxX = calculateNodeXPosition(this.nodes, this.flows);
    this.maxY = calculateNodeYPosition(this.nodes, this.maxX, this.config);
    const padding = this.maxY / this.height * this.config.padding;
    this.maxY = addPadding(this.nodes, padding, this.maxX);
    sortFlows(this.nodes);
    renderLabels(groupLabels, this.nodes, this.config, this.maxX);
    this.maxNodeWidth = nodeLabelSpaceAllocation(this.nodes, this.config, this.maxX);
    styling(svg2, this.nodes, this.flows, this.config);
    scaling(this.nodes, this.flows, this.config, this.width, this.height, this.maxX, this.maxY, this.maxNodeWidth);
    renderNodesFlows(svg2, groupNodes, groupFlows, this.nodes, this.flows, this.config, this.width, this.height, this.maxX, this.maxY);
    finalizeTooltips();
    drag(svg2, this.nodes, config.scaleX, config.scaleY, groupFlows);
  }
};
export {
  Sankey
};
