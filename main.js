// ---- Compute the size of SVG elements ----
const body = document.getElementsByTagName('body')[0];
var computedStyle = getComputedStyle(body);

const bh = body.clientHeight
    - parseFloat(computedStyle.paddingTop)
    - parseFloat(computedStyle.paddingBottom);
const bw = body.clientWidth
    - parseFloat(computedStyle.paddingLeft)
    - parseFloat(computedStyle.paddingRight);

const ratio = document.documentElement.clientWidth
                / document.documentElement.clientHeight;
const elw = Math.min((ratio > 1) ? bw/2 : bw, 400);
const elh = Math.min((ratio > 1) ? bh : bh/2, 400);

d3.select("svg.dag").attr("viewBox", `-40 -50 ${elw+80} ${elh+100}`);
const svg = d3.select("svg.network")
                .attr("viewBox", `-20 -20 ${elw+40} ${elh+40}`);
const sim_scale = Math.min(1, Math.min(elw, elh)/400);

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

    setTimeout(() => updateLinks());
    loadSimulation(simulation.constructor, simulation.opts);
});

const sselect = document.getElementById("simulation-select");
controls(sselect, "Model", SIMULATIONS, loadSimulation);

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
    stroke: "#786e60",
    strokewidth: 3,
    text: ""
};
const dse = {
    width: 6,
    fill: "#ddd",
    stroke: "rgba(30, 30, 30, 0.5)",
    strokewidth: 2
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
const physics = d3.forceSimulation()
    .nodes(network.nodes)
    .force("link", d3.forceLink(network.edges)
                        .id(d => d.id)
                        .distance(20)
                        // Higher weight edges should keep their nodes closer
                        .strength(d => sim_scale * d.weight / 2))
    .force("repel", d3.forceManyBody()
                        .strength(-500 * sim_scale)
                        .distanceMax(300 * sim_scale))
    .force("center", d3.forceCenter(elw/2, elh/2));

// Potentially can DRY here...
function updateLinks() {
    physics.nodes(network.nodes)
           .force("link")
           .links(network.edges);
    update_graphics();
    physics.alpha(0.2).restart();
}

var link = svg.append("g")
                .classed("links", true)
            .selectAll("g"),

    node = svg.append("g")
                .classed("nodes", true)
            .selectAll("g");

timer.start();
physics.alpha(0.2).restart()
physics.on("tick", () => {
    // Move the nodes and lines
    network.nodes.forEach(d => {
        d.x = Math.min(Math.max(15, d.x), elw-15);
        d.y = Math.min(Math.max(15, d.y), elh-15);
    })
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
    if (!d3.event.active) physics.alphaTarget(0.2).restart();
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
    d.fx = null;
    d.fy = null;
}

function clicked(e, d) {
    // Dragged
    if (e.defaultPrevented) return;
    simulation.click(d);
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
