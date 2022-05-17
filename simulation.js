/* 
*   About the simulation-type classes.
*   The constructor's first parameter should be a `network` object, consisting of
*       nodes: array of objects representing nodes.
*       matrix: array of objects giving easy access to the adjacency/following relation
*       edges: array of objects containing the directed edges.
*   The _tick() function should take no arguments and change state on the nodes and edges that were passed with the constructor,
*       according to a single iteration of whatever is being simulated.
*   The _init() function should set the *simulation* to its initial state.
*   This _click() function will be called and passed a node when a node is clicked.
*
*   Do NOT change the following state:
*       nodes:
*           node.x, node.y, node.fx, node.fy, node.id
*       edges:
*           edge.source, edge.target, edge.id, edge.self
*   The following state will, if set, be used by the graphics engine to draw the styles of the nodes and edges:
*       nodes:
*           node.radius
*           node.fill
*           node.stroke
*           node.strokewidth
*           node.text
*           [add a way to use the bubbles??]
*           [add a way to flash a node?]
*       edges:
*           edge.width
*           edge.fill
*           edge.stroke
*           edge.strokewidth
*           [edge.length??]
*   Besides that, you can set whatever variables needed to compute the simulation.
*
*
*/

class Simulation {
    static name = "Null Simulation";
    static params = [];

    constructor(network, opts) {
        this.nodes = network.nodes;
        this.edges = network.edges;
        this.matrix = network.matrix;
        this.opts = opts;
    }

    _tick() {}
    _init() {}
    _click(node) {}

    tick() {
        this._tick();
        if (this._onchange)
            this._onchange();
    }
    restart() {
        this._init();
        if (this._onchange)
            this._onchange();
    }
    click(node) {
        this._click(this.nodes[node]);
        if (this._onchange)
            this._onchange();
    }
    set onchange(handler) {
        this._onchange = handler;
    }

    cleanup() {
        // Removes all custom styling on the network
        this.nodes.forEach(n => n.radius = n.fill = n.stroke = n.strokewidth = n.text = undefined);
        this.edges.forEach(e => e.width = e.fill = e.stroke = e.strokewidth = undefined);
    }

}

class LinearDeterministicDiffusionSimulation extends Simulation {
    static name = "Deterministic Linear Diffusion";
    static params = [];

    constructor(network, opts) {
        super(network, opts);
        this._init();
        // Set edge widths
        this.edges.forEach((e) => {
            e.width = 8 * e.weight + 1;
            e.strokewidth = 2;
        });   
    }
    _tick() {
        // Freeze the before-tick copy of each node
        const opinion_old = this.nodes.map(n => n.opinion);
        this.nodes.forEach((x) => {
            let op = 0;
            let x_mat = this.matrix[x.id];
            for (let [y, kxy] of Object.entries(x_mat)) {
                op += opinion_old[y] * kxy;
            }
            x.opinion = op;
            x.fill = d3.interpolateCividis(op);
        });

    }
    _init() {
        // Initialize the opinions randomly
        this.nodes.forEach((n) => {
            n.opinion = Math.random();
            n.fill = d3.interpolateCividis(n.opinion);
        });
    }
    cleanup() {
        super.cleanup();
        this.nodes.forEach(n => delete n.opinion);
    }

}


class LocalStochasticInformationSimulation extends Simulation {

    static name = "Stochastic Local Information";
    static params = [];

    constructor(network, opts) {
        super(network, opts);
        this.FILLS = ["#ddd", "#9cd", "#2bd", "#2bd"];
        this.STROKES = ["#689", "#689", "#689", "#bd2"];
        this.edges.forEach((e) => {
            e.width = 8 * e.weight + 1;
            e.strokewidth = 2;
        });
        this._init();
    }

    _tick() {
        // Freeze the before-tick copy of each node
        const information_old = this.nodes.map(n => n.information);
        this.nodes.forEach((n, i) => {
            let ret = n.information;
            let fill = 0;
            switch (n.information) {
                case 0: // Not seen, not posted
                case 1: // Seen, not posted
                    const seen_influence = Object.entries(this.matrix[i])
                        .map(([y, kxy]) => (information_old[y] == 3 ? kxy : 0))
                        .reduce((a, b) => a+b);
                    if (seen_influence)
                        ret = (Math.random() < seen_influence) ? 3 : 1;
                    break;
                case 2: // Seen, posted
                case 3: // Actively posting
                    ret = 2;
                    break;
                    
            }
            n.information = ret;
            this.setStyles(n);
        });
        
    }
    _init() {
        // No one has seen the information
        this.nodes.forEach((n) => {
            n.information = 0;
            this.setStyles(n);
        });

    }
    _click(n) {
        n.information = 3;
        this.setStyles(n);
    }

    cleanup() {
        super.cleanup();
        this.nodes.forEach(n => delete n.information);
    }

    setStyles(node, state) {
        if (state === undefined)
            state = node.information;
        node.fill = this.FILLS[state];
        node.stroke = this.STROKES[state];
    }
}

const SIMULATIONS = [LinearDeterministicDiffusionSimulation, LocalStochasticInformationSimulation];
