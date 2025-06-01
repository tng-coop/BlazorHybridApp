// d3demo.js
window.d3Demo = {
  init: function() {
    // ──────────────────────────────────────────────
    // 1) CSV data as a string (your provided rows)
    // ──────────────────────────────────────────────
    var csvString = `Zipcode,Count,Latitude,Longitude
210-0814,1,35.5303,139.7327
210-0833,1,35.5210,139.7238
211-0051,1,35.5902,139.6421
213-0032,1,35.6122,139.6022
226-0016,1,35.5047,139.5481
226-0029,1,35.5093,139.5330
227-0036,1,35.5621,139.4828
230-0001,1,35.5335,139.6796
231-0026,1,35.4438,139.6456
238-0224,1,35.1488,139.6305
240-0026,1,35.4436,139.5932
240-0067,1,35.4734,139.5909
243-0402,1,35.4632,139.4120
244-0003,3,35.3911,139.5273
245-0014,1,35.4063,139.5096
245-0061,1,35.3991,139.5146
245-0062,1,35.3911,139.5178
251-0035,1,35.3134,139.4866
251-0043,1,35.3308,139.4467
251-0047,1,35.3308,139.4467
251-0875,1,35.3554,139.4706
252-0025,1,35.4739,139.3861
252-0303,1,35.5315,139.4345
252-0321,1,35.5172,139.4107
252-0802,4,35.4128,139.4714
252-0813,3,35.3784,139.4751
254-0014,1,35.3601,139.3676
254-0018,1,35.3578,139.3539
254-0061,1,35.3451,139.3292
254-0084,1,35.3563,139.3293
254-0813,1,35.3176,139.3506
254-0906,2,35.3464,139.3016
259-1205,1,35.3429,139.2550
258-0017,1,35.3194,139.1504`;

    var rawData = d3.csvParse(csvString, function(d) {
      return {
        count: +d.Count,
        lat:   +d.Latitude,
        lon:   +d.Longitude
      };
    });

    // ──────────────────────────────────────────────
    // 2) Grab reference to the container
    // ──────────────────────────────────────────────
    var container = document.getElementById("d3-container");
    if (!container) {
      console.error("Element #d3-container not found.");
      return;
    } else {
      console.log("Container found:", container);
    }

    // ──────────────────────────────────────────────
    // 3) Core draw function, now with margin
    // ──────────────────────────────────────────────
    function drawHexGrid() {
      // 3a) Measure full container’s size
      var rawWidth  = container.clientWidth;
      var rawHeight = container.clientHeight;
      if (rawWidth === 0 || rawHeight === 0) {
        console.warn("Container is zero-sized, skipping draw.");
        return;
      }

      // 3b) Define margin (pixels of padding on all sides)
      var margin = 0;

      // 3c) Compute “inner” width/height after accounting for margins
      var width  = rawWidth  - margin * 2;
      var height = rawHeight - margin * 2;
      if (width <= 0 || height <= 0) {
        console.warn("Margin too large for container size.");
        return;
      }

      // 3d) Compute lon/lat extents
      var lonExtent = d3.extent(rawData, d => d.lon);
      var latExtent = d3.extent(rawData, d => d.lat);

      // 3e) Create linear scales based on inner size
      var xScale = d3.scaleLinear()
        .domain(lonExtent)
        .range([0, width]);

      var yScale = d3.scaleLinear()
        .domain(latExtent)
        .range([height, 0]); // flip so higher lat is “up”

      // 3f) Expand each row by its count → flat array of {px, py}
      var points = [];
      rawData.forEach(function(d) {
        var px = xScale(d.lon),
            py = yScale(d.lat);
        for (var i = 0; i < d.count; i++) {
          points.push({ px, py });
        }
      });

      // 3g) Define hex‐cell radius and spacings
      var R = 90; // radius of each hex cell
      var horiz = Math.sqrt(3) * R;
      var vert  = 1.5 * R;

      // 3h) Build a uniform hex grid of centers that lie fully inside the inner area
      var gridCells = []; // each: { i, j, cx, cy, used:false }
      for (var j = 0; ; j++) {
        var cy = R + j * vert;
        if (cy > height - R) break;
        var xOffset = (j % 2) * (horiz / 2);
        for (var i = 0; ; i++) {
          var cx = R + i * horiz + xOffset;
          if (cx > width - R) break;
          gridCells.push({ i, j, cx, cy, used: false });
        }
      }

      // 3i) Assign points to nearest unused grid cell
      var hexes = []; // will hold { cx, cy, r: R }
      points.forEach(function(pt) {
        // For each grid cell, compute squared distance to (pt.px, pt.py)
        var dists = gridCells.map(function(cell, idx) {
          var dx = cell.cx - pt.px;
          var dy = cell.cy - pt.py;
          return { idx: idx, dist2: dx * dx + dy * dy };
        });
        dists.sort((a, b) => a.dist2 - b.dist2);
        for (var k = 0; k < dists.length; k++) {
          var cell = gridCells[dists[k].idx];
          if (!cell.used) {
            cell.used = true;
            // Remember: cx,cy are in “inner” coordinates; we'll shift them by margin later
            hexes.push({ cx: cell.cx, cy: cell.cy, r: R });
            break;
          }
        }
      });

      // 3j) Remove existing SVG
      d3.select(container).selectAll("svg").remove();

      // 3k) Append new SVG sized to the full container (including margin)
      var svg = d3.select(container)
        .append("svg")
        .attr("width",  rawWidth)
        .attr("height", rawHeight)
        .style("display", "block");

      // 3l) Append a <g> shifted by (margin, margin) so (0,0) is top-left of inner area
      var group = svg.append("g")
        .attr("transform", `translate(${margin},${margin})`);

      // 3m) Draw each hexagon and label it
      var hexbin = d3.hexbin().radius(R);

      // Create one <g> per hex, positioned at (cx, cy)
      var hexGroups = group.selectAll("g.hex")
        .data(hexes)
        .enter()
        .append("g")
          .attr("class", "hex")
          .attr("transform", d => `translate(${d.cx},${d.cy})`);

      // 3m.1) Draw the hexagon shape
      hexGroups.append("path")
        .attr("d", hexbin.hexagon())
        .attr("fill", "steelblue")
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

      // 3m.2) Draw a two-digit label (01, 02, …) in the center of each hex
      hexGroups.append("text")
        .text((d, i) => String(i + 1).padStart(2, "0"))
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")           // vertically center
        .attr("fill", "white")
        .attr("font-size", R * 0.6 + "px");
    }

    // ──────────────────────────────────────────────
    // 4) Initial draw & watch for container resizing
    // ──────────────────────────────────────────────
    drawHexGrid();
    new ResizeObserver(drawHexGrid).observe(container);
  }
};

// Trigger initial draw when script loads
window.d3Demo.init();
