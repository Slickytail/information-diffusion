// ---- Compute the size of SVG elements ----

var svg, svg_w, svg_h;
function setViewbox() {
    svg = d3.select("svg.network");

    const bbox = svg.node().getBoundingClientRect();
    const ratio = bbox.width / bbox.height;
    svg_w = (ratio > 1) ? ratio * 400 : 400;
    svg_h = (ratio > 1) ? 400 : 400 / ratio;

    svg.attr("viewBox", `${-svg_w/2} ${-svg_h/2} ${svg_w} ${svg_h}`);

    // Make sure nodes don't clip.
    // Run a few ticks at very low heat to clamp
    if (physics)
        physics
            .alpha(Math.max(0.02, physics.alpha()))
            .restart();
}
// Since we set `defer` on this script, the svg element will already exist when we call this
setViewbox();
window.addEventListener("resize", setViewbox);

// ---- Actually initialize the simulation ----
// TODO: Find a cleaner way of doing this initialization
// Load a graph. The controls() call below will change this.
let network = new NETWORKS[0]();
// Load a simulation model.
let simulation = new Simulation(network, {});
var timer = new Timer();

// Called when the simulation type is changed
// Loads a new simulation class and binds it to the timer and graphics
function loadSimulation(c, opts) {
    simulation = new c(network, opts);
    simulation.onchange = () => requestAnimationFrame(update_graphics);
    timer.ontick = () => simulation.tick()
}

// ---- Set up the controls ----
// Play/pause button
document.getElementById('play-pause').onclick = function() {
    timer.paused = !timer.paused;
    d3.select(this)
        .text(timer.paused ? "play_arrow" : "pause");
};
// Restart
document.getElementById('restart').onclick = () => {
    if (!timer.paused) {
        // timer.paused is actually a setter
        // so this will reset the tick counter.
        timer.paused = true;
        timer.paused = false;
    }
    simulation.restart();
};

// Timer is simple, no need to use the controls system
document.getElementById('timing').oninput = () => {
    let timing = document.getElementById('timing').value ** 2;
    document.getElementById('timing-text').innerText = `${timing.toFixed(1)}/s`;
    timer.timing = 1000/timing;
};
document.getElementById('timing').oninput();
// The rest of the controls are handled by the input module
const nselect = document.getElementById("network-select");
controls(nselect, "Graph", NETWORKS, (n, opts) => {
    // When network changed
    network = new n(opts);
    loadSimulation(simulation.constructor, simulation.opts);
    // The initial call to controls() will call the callback with the default selection
    // At this point, the physics sim might not be defined.
    if (physics)
        updateLinks();
    // In that case, we'll queue the update instead.
    else
        setTimeout(updateLinks);
}, setViewbox);

const sselect = document.getElementById("simulation-select");
controls(sselect, "Model", SIMULATIONS, loadSimulation, setViewbox);

/*
// Make a node flash... 
function flash_node(uid) {
    let c = d3
        .selectAll("svg.network .nodes > g")
        .filter(d => d.id == uid)
        .select("circle");
    if (c.classed("edit-blip-1")) {
        c.classed("edit-blip-1", false);
        c.classed("edit-blip-2", true);
    } else {
        c.classed("edit-blip-2", false);
        c.classed("edit-blip-1", true);
    }
}
*/
const dsn = {
    radius: 10,
    fill: "#c8dcf0",
    stroke: "black",
    strokewidth: 2,
    text: ""
};
const dse = {
    width: 6,
    fill: "#444",
    stroke: "rgba(0, 0, 0, 0.1)",
    strokewidth: 1
};
// Update the styling of the nodes and edges
function update_graphics() {
    // Bind the nodes to the data
    node = node.data(network.nodes, d => d.id);
    // Remove deleted nodes
    node.exit().remove();
    // Add new nodes and draw circles on them
    let enter = node.enter()
        .append("g")
        .classed("node-group", true)
        .attr("data-pid", d => d.id);
    enter.append("circle")
        .classed("node", true);
    /*
    enter.append("rect")
        .classed("node-label-background", true);
    enter.append("text")
        .classed("node-label", true)
        .attr("x", 13)
        .attr("y", -10)
        .text((d, i) => `#${i+1}`);
    enter.select("rect")
        .each(function (d) {
            // hopefully this.nextSibling will always be the text.
            var box = this.nextSibling.getBBox();
            const pad_x = 7;
            const pad_y = 1;
            d3.select(this)
                .attr("x", box.x - pad_x)
                .attr("y", box.y - pad_y)
                .attr("width", box.width + pad_x * 2)
                .attr("height", box.height + pad_y * 2)
                .attr("rx", pad_y + box.height/2);
        });*/
    // Add interaction to new nodes
    enter.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
        .on("click", clicked);
        //.on('mouseover', hoverOn);
    // Merge new nodes
    node = node.merge(enter)
        .classed("selected", d => d.selected);
    
    // Update dynamic styling
    node.select("circle.node")
        .attr("r", d => d.radius || dsn.radius)
        .attr("fill", d => d.fill || dsn.fill)
        .attr("stroke-width", d => d.strokewidth || dsn.strokewidth)
        .attr("stroke", d => d.stroke || dsn.stroke);

    // Bind links, remove deleted, and add new.
    link = link.data(network.edges, d => d.id);
    link.exit().remove();
    let link_enter = link.enter()
        .append("g")
        .classed("line-group", true)
        .classed("self", d => d.self);
    // We have to put two lines
    link_enter.append("line").classed("bg-line", true);
    link_enter.append("line").classed("fg-line", true);
    link = link.merge(link_enter);
    
    // Update line syles
    link.select("line.bg-line")
        .attr("stroke-width", d => (d.width || dse.width) + 2 * (d.strokewidth || dse.strokewidth))
        .attr("stroke", d => d.stroke || dse.stroke);
    link.select("line.fg-line")
        .attr("stroke-width", d => d.width || dse.width)
        .attr("stroke", d => d.fill || dse.fill)
        .attr("fill", d => d.fill || dse.fill);
        
}
/*
// Update fissure notifications for peers 
var colors = {};
function fis(f) {
    let m = f.a < f.b ? f.a : f.b,
        p = f.a < f.b ? f.b : f.a;
    return {
        min: m,
        plus: p,
        sign: f.a < f.b ? "+" : "-",
        tag: `${m}:${p}`
    };
};
function update_fissures() {
    let fissures = new Set();
    for (let p of Object.values(trial.peers)) {
        Object.values(p.fissures)
            .forEach(f => fissures.add(fis(f).tag));
    }
    // Delete unused colors
    for (let f of Object.keys(colors)) {
        if (!fissures.has(f))
            delete colors[f];
    }
    for (let f of fissures) {
        if (!colors[f]) {
            // Let's find a new color
            // What we want to do is find the color that is furthest away from every other color
            let positions = Object.values(colors).map(c => c.angle).sort().concat([1]);
            let best = 0,
                biggest = positions[0];
            for (let i = 0; i < positions.length - 1; i++) {
                let smaller = positions[i];
                let bigger = positions[i+1];
                if (bigger - smaller > biggest) {
                    best = (bigger + smaller) / 2;
                    biggest = bigger - smaller;
                }
            }

            colors[f] = {angle: best, color: d3.interpolateRainbow(best)};
        }
    }
    
    let fdots = node
        .selectAll("g.fissure")
        .data(d => Object.values(trial.peers[d.id].fissures).map(fis),
                f => f.tag+f.sign);
    
    fdots.exit().remove();

    let e = fdots
        .enter()
        .append("g")
        .classed("fissure", true)
    
    e.append("circle")
        .classed("fissure-circ", true)
        .attr("r", 7)
        .attr("fill", f => colors[f.tag].color);
    e.append('text')
        .classed("fissure-sign", true)
        .html(f => f.sign == "-" ? "&minus;" : "+")
        .attr("y", 5);
    fdots = fdots.merge(e)
        .attr("transform", (f, i) => `translate(${i * 18 + 20}, 10)`);
}
*/
// Initialize the force simulation
var physics = d3.forceSimulation()
    .nodes(network.nodes)
    .force("link", d3.forceLink(network.edges)
                        .id(d => d.id)
                        .distance(20)
                        // Higher weight edges should keep their nodes closer
                        .strength(d => d.weight / 3))
    .force("repel", d3.forceManyBody()
                        .strength(-500)
                        .distanceMax(180))
    .force("center", d3.forceCenter(0, 0));

function updateLinks() {
    physics.nodes(network.nodes)
           .force("link")
           .links(network.edges);
    physics.alpha(0.3).restart();
    requestAnimationFrame(update_graphics);
}

var link = svg.append("g")
                .classed("links", true)
            .selectAll("g"),

    node = svg.append("g")
                .classed("nodes", true)
            .selectAll("g");

physics.alpha(0.3).restart()
const clampSym = (x, l) => Math.min(Math.max(-l, x), l);
physics.on("tick", () => {
    // Move the nodes and lines
    network.nodes.forEach(d => {
        d.x = clampSym(d.x, svg_w/2 - 15);
        d.y = clampSym(d.y, svg_h/2 - 15);
    });
    link.selectAll("line")
        // Duplicate the data from the group to the two individual lines
        .data(d => [d, d])
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

});

function dragstarted(d) {
    if (!d3.event.active)
        physics.alphaTarget(0.2).restart();
    d.fx = d.x;
    d.fy = d.y;
    //hoverOn(d);
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) physics.alphaTarget(0);
    if (!d.fixed) {
        d.fx = null;
        d.fy = null;
    }
}

function clicked(d) {
    // Cancel if dragged
    if (d3.event.defaultPrevented) return;
    simulation.click(d);
    d3.event.stopPropagation();
}
/*
function hoverOn(d) {
    let clear = d != p_data;
    force = false;
    if (p_data)
        p_data.selected = false;
    
    d.selected = true;
    P = trial.peers[d.id];
    
    d3.selectAll("svg.network .nodes > g")
        .classed("selected", d => d.selected);
    d3.selectAll(".selected-peer")
        .text(`Peer #${d.index + 1}`);
    p_data = d;
    requestAnimationFrame(() => {
        update_panels(clear);
    });
}
*/
