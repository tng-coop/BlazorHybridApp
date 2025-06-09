window.efInspection = {
  render: function(entities) {
    var nodes = entities.map(e => ({ id: e.name }));
    var links = [];
    entities.forEach(e => {
      if (e.navigations) {
        e.navigations.forEach(n => {
          links.push({ source: e.name, target: n.target });
        });
      }
    });

    var container = document.getElementById('ef-diagram');
    if (!container) return;
    var width = container.clientWidth || 600;
    var height = container.clientHeight || 400;
    d3.select(container).selectAll('svg').remove();
    var svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // draw arrowheads for links
    var defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 25)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,0 L10,5 L0,10 Z')
        .attr('fill', '#666');

    var link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none')
      .attr('marker-end', 'url(#arrow)');

    var node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', 20)
      .attr('fill', 'steelblue')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    var label = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text(d => d.id)
      .attr('font-size', '20px')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em');

    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-30))
      .force('center', d3.forceCenter(width / 2, height / 2));

    simulation.on('tick', () => {
      link
        .attr('d', d =>
          `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`
        );

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
};
