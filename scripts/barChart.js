import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {
  SCREEN_TECH_PALETTE,
  upsertLegend,
  bindResizeListener,
  flagChartReady,
} from './chartUtils.js';

/**
 * Builds a bar chart comparing mean labelled energy consumption for 55" TVs
 * grouped by screen technology.
 */
export const initBarChart = (selector, dataUrl) => {
  const container = document.querySelector(selector);
  if (!container) return {};

  const palette = new Map(Object.entries(SCREEN_TECH_PALETTE));
  let dataset = [];
  let average = 0;

  const render = () => {
    if (!dataset.length) return;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 320);
    const height = Math.max(bounds.height, 300);
    const margin = { top: 36, right: 24, bottom: 62, left: 74 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.innerHTML = '';

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const chart = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(dataset.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.32);

    const yMax = d3.max(dataset, (d) => d.value) * 1.12;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    const xAxis = (g) =>
      g
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .call((selection) => selection.select('.domain').remove())
        .call((selection) =>
          selection
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 46)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .text('Screen technology')
        );

    const yAxis = (g) =>
      g
        .call(d3.axisLeft(yScale).ticks(Math.min(8, Math.round(innerHeight / 60))))
        .call((selection) =>
          selection
            .selectAll('.tick line')
            .clone()
            .attr('x2', innerWidth)
            .attr('stroke', '#E2E8F0')
        )
        .call((selection) => selection.select('.domain').remove())
        .call((selection) =>
          selection
            .append('text')
            .attr('x', -innerHeight / 2)
            .attr('y', -56)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Mean labelled energy (kWh/year)')
        );

    chart.append('g').call(xAxis);
    chart.append('g').call(yAxis);

    // Reference line for the category average to anchor the comparison visually.
    chart
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(average))
      .attr('y2', yScale(average))
      .attr('stroke', '#cbd5f5')
      .attr('stroke-dasharray', '6 6')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85);

    const bars = chart
      .append('g')
      .selectAll('rect')
      .data(dataset)
      .join('rect')
      .attr('x', (d) => xScale(d.label))
      .attr('y', (d) => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.value))
      .attr('fill', (d) => palette.get(d.label))
      .attr('rx', 10)
      .attr('aria-label', (d) => `${d.label} ${d.value.toFixed(0)} kilowatt hours`)
      .attr('role', 'presentation');

    bars
      .append('title')
      .text((d) => `${d.label}: ${d.value.toFixed(1)} kWh/year`);

    const valueLabels = chart
      .append('g')
      .selectAll('text')
      .data(dataset)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 600)
      .attr('fill', '#1f2933')
      .attr('x', (d) => xScale(d.label) + xScale.bandwidth() / 2)
      .attr('y', (d) => clamp(yScale(d.value) - 10, 18, innerHeight - 12))
      .attr('font-size', '0.9rem')
      .text((d) => `${d.value.toFixed(0)} kWh`);

    valueLabels
      .append('title')
      .text((d) => `Mean energy use: ${d.value.toFixed(1)} kWh`);

    const averageLabel = `Category average: ${average.toFixed(0)} kWh`;
    const legendContainer = container.parentElement?.querySelector(
      '.chart-legend[data-chart="bar"]'
    );

    if (legendContainer) {
      const existing = legendContainer.querySelector('.chart-legend__average');
      const swatchHtml =
        '<span class="chart-legend__swatch" style="background:transparent;border:2px dashed #cbd5f5;border-radius:2px;width:20px;height:0;display:inline-block"></span>';
      const content = `${swatchHtml}${averageLabel}`;
      if (existing) {
        existing.innerHTML = content;
      } else {
        const item = document.createElement('span');
        item.className = 'chart-legend__item chart-legend__average';
        item.innerHTML = content;
        legendContainer.appendChild(item);
      }
    }

    flagChartReady(container);
  };

  const loadData = async () => {
    // Values are already aggregated in the CSV, so we simply coerce numbers and filter empties.
    const raw = await d3.csv(dataUrl, (d) => {
      const value = Number(d['Mean(Labelled energy consumption (kWh/year))']);
      if (!Number.isFinite(value)) return null;
      return { label: d.Screen_Tech, value };
    });

    dataset = raw.filter(Boolean);
    average = dataset.reduce((sum, item) => sum + item.value, 0) / dataset.length;

    upsertLegend(
      container,
      dataset.map((d) => ({ label: d.label, colour: palette.get(d.label) })),
      'bar'
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
