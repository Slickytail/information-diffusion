const randomExp = () => -Math.log(1 - Math.random());

// ---- If you add a new network type, make sure to add it to the array NETWORKS---
// ---- Also make sure to implement the configuration stuff (static part at the top)

class RandomNetwork {

    static name = "Random Graph";
    static params = [
        {
            arg: "n",
            text: "N Nodes",
            val: 10,
            min: 2,
            max: 30,
            step: 1
        },
        {
            arg: "p",
            text: "Connect Prob",
            val: 0.2,
            min: 0,
            max: 1
        },
        {
            arg: "b",
            text: "Self-Weight Bias",
            val: 1,
            min: 0,
            max: 2
        }

    ];

    constructor(opts) {
        opts = opts || {};
        let n = opts.n || 10;
        let p = opts.p || 0.2;
        let b = opts.b || 0.0;
        // Other options: what distribution to use for connections,
        // what distribution to use for number of peers,
        // what distribution to use for Kxy, etc

        this.nodes = Array(n).fill(null).map((_, i) => {
            return {id: i}
        });
        this.matrix = Array(n).fill(null);
        this.edges = [];
        // For each node, pick edges randomly
        for (let x = 0; x < n; x++) {
            let total_weight = 0;
            let x_out = {};
            for (let y = 0; y < n; y++) {
                // Force creating a connection to self
                if (Math.random() < p || y == x) {
                    let kxy = randomExp();
                    // The connection to self is generally stronger.
                    if (y == x)
                        kxy += b;
                    total_weight += kxy;
                    x_out[y] = kxy;
                }
            }
            // Normalize so the edge weights sum to 1
            // Also put them in the edges array
            Object.keys(x_out).forEach((y) => {
                x_out[y] /= total_weight;
                this.edges.push({
                    source: x,
                    target: y,
                    id: `${x}-${y}`,
                    weight: x_out[y],
                    self: x == y
                })
            })
            this.matrix[x] = x_out;
        }
    }
}

class CartesianNetwork {

    static name = "Cartesian Graph";
    static params = [
        {
            arg: "w",
            text: "Width",
            val: 4,
            min: 1,
            max: 10,
            step: 1
        },
        {
            arg: "h",
            text: "Height",
            val: 4,
            min: 1,
            max: 10,
            step: 1
        },
        {
            arg: "b",
            text: "Self-Weight",
            val: 0,
            min: 0,
            max: 1
        }
    ];

    constructor(opts) {
        opts = opts || {};
        let w = opts.w || 4;
        let h = opts.h || 4;
        let b = opts.b || 0.0;

        // Position calculation: the svg viewbox will always contain a 400x400 box centered on (0, 0).
        const spacing = 400 / (Math.max(w, h));
        this.nodes = Array(w*h).fill(null);
        this.matrix = Array(w*h).fill(null);
        this.edges = [];
        // For each node, initialize the cartesian edges
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                let id = x * h + y;
                this.nodes[id] = {
                    id: id,
                    row: y,
                    col: x,
                    fx: spacing * (x - w/2 + 1/2),
                    fy: spacing * (y - h/2 + 1/2),
                    fixed: true
                };
                
                const neighbors = ( (x == 0 || x == w - 1) ? 1 : 2) +
                                  ( (y == 0 || y == h - 1) ? 1 : 2);
                this.matrix[id] = {};
                let add_edge = (xi, yi) => {
                    const w = (xi == x && yi == y) ? b : (1 - b) / neighbors;
                    const target = xi * h + yi;
                    this.matrix[id][target] = w;
                    this.edges.push({
                        source: id,
                        target: target,
                        id: `${id}-${target}`,
                        weight: w,
                        self: xi == x && yi == y
                    });
                }
                add_edge(x, y)
                if (x != 0)
                    add_edge(x-1, y)
                if (y != 0)
                    add_edge(x, y-1)
                if (x != w - 1)
                    add_edge(x+1, y)
                if (y != h - 1)
                    add_edge(x, y+1)
            }
        }
    }
}
const NETWORKS = [RandomNetwork, CartesianNetwork];
