window.d3Demo = {
    init: function () {
        const data = [30, 86, 168, 281, 303, 365];
        d3.select("#d3-container")
            .selectAll("div")
            .data(data)
            .enter()
            .append("div")
            .style("background-color", "steelblue")
            .style("margin", "2px")
            .style("height", "20px")
            .style("width", function (d) { return d + "px"; })
            .style("color", "white")
            .text(function (d) { return d; });
    }
};
