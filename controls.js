// el: an element to contain the controls.
// name: the top-level dropdown label
// options: an array of classes with certain static fields (see network.js for details)
// cb: function(class, opts)

function controls(el, name, options, cb) {
    let container = d3.select(el);
    let topselect = container
        .append("div")
        .classed("subgrid", true)
        .classed("toplevel-selection", true);
    // Make a label
    topselect
        .append("label")
        .classed("input-name", true)
        .text(name);
    let dropdown = topselect.append("select");
    // To make the grid work properly...
    topselect.append("span").classed("dummy", true);

    // exit, enter, merge pattern!
    // Not really necessary, since we probably only have to do this once
    // But it's such a clean paradigm!!!
    let entries = dropdown
        .selectAll("option").data(options);
    entries.exit()
        .remove();
    entries.enter()
        .append("option")
        .attr("selected", (d, i) => i === 0 ? true : null)
        .attr("value", (d, i) => i)
        .text(d => d.name)
        .merge(entries);

    // When the dropdown changes its value, we'll populate the rest of the panel with its chosen options
    dropdown.on("change", function () { toplevelchange(options[this.value]) });
    const toplevelchange = (c) => {
        let params = c.params;
        let inputs = container
            .selectAll("div.dynamic-param")
            .data(params, d => d.arg);
        inputs.exit()
            .remove();
        let enter = inputs.enter()
            .append("div")
            .classed("subgrid", true)
            .classed("dynamic-param", true);

        enter.append("label")
            .classed("input-name", true);
        enter.append("input")
            .attr("type", "range");
        enter.append("label")
            .classed("input-val", true)

        // Merge + Update
        inputs = inputs.merge(enter);
        inputs.select("label.input-name")
            .text(d => d.text);
        inputs.select("label.input-val")
            .text(d => formatNumber(d.val, d.step));
        inputs.select("input")
            .attr("min", d => d.min)
            .attr("max", d => d.max)
            .attr("step", d => d.step || "any")
            .attr("value", d => d.val)
            .property("value", d => d.val)
            // This could probably be done more efficiently...
            .on("input", function(data) {
                d3.select(this.parentNode)
                  .select("label.input-val")
                  .text(formatNumber(this.value, data.step));

                // Actually update the parameter...
                cur_opts[data.arg] = parseFloat(this.value);
                cb(c, cur_opts);
            });

        // Store current value of the options
        let cur_opts = {};
        // Initialize each option to the default value
        params.forEach(p => cur_opts[p.arg] = p.val);
        // callback with the selected class and the default options
        cb(c, cur_opts);

    }
    toplevelchange(options[0]);
}

function formatNumber(num, step) {
    num = parseFloat(num)
    if (step == 1 && num == Math.round(num))
        return num.toFixed();
    return num.toFixed(2);
}
