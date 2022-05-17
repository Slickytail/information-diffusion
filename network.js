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
        let b = opts.b || 1.00;
        // Other options: what distribution to use for connections,
        // what distribution to use for number of peers,
        // what distribution to use for Kxy, etc

        this.nodes = Array(n).fill(null).map((e, i) => {
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

const NETWORKS = [RandomNetwork];
