import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {
  SCREEN_TECH_PALETTE,
  upsertLegend,
  bindResizeListener,
  flagChartReady,
} from './chartUtils.js';

// Renders the donut chart showing the average energy draw per screen technology.
export const initDonutChart = (selector, dataUrl) => {
  const container = document.querySelector(selector);
  if (!container) return {};

  const palette = new Map(Object.entries(SCREEN_TECH_PALETTE));
  let dataset = [];

  const render = () => {
    if (!dataset.length) return;

    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 280);
    const height = Math.max(bounds.height, 280);
    const size = Math.min(width, height);
    const radius = size / 2 - 10;

    container.innerHTML = '';

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create a little separation between arcs to emphasise categorical differences.
    const pie = d3
      .pie()
      .value((d) => d.value)
      .padAngle(0.02)
      .sort(null);

    const arc = d3
      .arc()
      .innerRadius(radius * 0.55)
      .outerRadius(radius);

    const total = d3.sum(dataset, (d) => d.value);
    const average = total / dataset.length;
    const arcsData = pie(dataset);

    const arcs = svg
      .selectAll('path')
      .data(arcsData)
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => palette.get(d.data.label))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('fill-opacity', 0.92)
      .attr('filter', 'drop-shadow(0px 6px 12px rgba(15, 23, 42, 0.12))');

    arcs.append('title').text(
      (d) =>
        `${d.data.label}\nAverage: ${d.data.value.toFixed(0)} kWh/year\nShare: ${(
          (d.data.value / total) *
          100
        ).toFixed(1)}%`
    );

    const textGroups = svg
      .selectAll('text')
      .data(arcsData)
      .join('g')
      .attr('transform', (d) => `translate(${arc.centroid(d)})`);

    textGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', Math.max(11, radius / 9))
      .attr('font-weight', 600)
      .attr('fill', '#1f2933')
      .text((d) => `${((d.data.value / total) * 100).toFixed(0)}%`);

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 6)
      .attr('fill', '#52606d')
      .attr('font-size', Math.max(12, radius / 8))
      .attr('font-weight', 600)
      .text('Average kWh');

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 30)
      .attr('fill', '#1f2933')
      .attr('font-size', Math.max(14, radius / 6.5))
      .attr('font-weight', 700)
      .text(`${average.toFixed(0)}`);

    flagChartReady(container);
  };

  const loadData = async () => {
    // The CSV fields already contain grouped means, so we just map and filter invalid rows.
    const raw = await d3.csv(dataUrl, (d) => {
      const value = Number(d['Mean(Labelled energy consumption (kWh/year))']);
      if (!Number.isFinite(value)) return null;
      return { label: d.Screen_Tech, value };
    });

    dataset = raw.filter(Boolean);
    upsertLegend(
      container,
      dataset.map((d) => ({ label: d.label, colour: palette.get(d.label) })),
      'donut'
    );
    render();
  };

  loadData();
  const disposeResize = bindResizeListener(container, render);

  return {
    destroy() {
      disposeResize();
    },
  };
};
