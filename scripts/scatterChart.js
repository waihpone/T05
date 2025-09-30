import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {
  SCREEN_TECH_PALETTE,
  upsertLegend,
  bindResizeListener,
  flagChartReady,
} from './chartUtils.js';

// Normalises screen technology labels into the three canonical categories shown in the legend.
const simplifyTech = (value = '') => {
  const normalised = value.toLowerCase();
  if (normalised.includes('oled')) return 'OLED';
  if (normalised.includes('led')) return 'LED';
  return 'LCD';
};

// Creates and renders the scatter plot that compares energy consumption to star rating.
export const initScatterChart = (selector, dataUrl) => {
  const container = document.querySelector(selector);
  if (!container) return {};

  const palette = new Map(Object.entries(SCREEN_TECH_PALETTE));

  let dataset = [];

  const render = () => {
    if (!dataset.length) return;

    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 320);
    const height = Math.max(bounds.height, 280);
    const margin = { top: 30, right: 28, bottom: 62, left: 68 };
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

    const xExtent = d3.extent(dataset, (d) => d.starRating);
    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - 0.2, xExtent[1] + 0.2])
      .range([0, innerWidth])
      .nice();

    const yMax = d3.max(dataset, (d) => d.energy);
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.08])
      .range([innerHeight, 0])
      .nice();

    const xAxis = (g) =>
      g
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .ticks(Math.min(10, Math.round(innerWidth / 70)))
            .tickSize(-innerHeight)
        )
        .call((g) => g.selectAll('.tick line').attr('stroke', '#E2E8F0'))
        .call((g) => g.selectAll('.domain').remove())
        .call((g) =>
          g
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 48)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .text('Star Rating (energy efficiency)')
        );

    const yAxis = (g) =>
      g
        .call(
          d3
            .axisLeft(yScale)
            .ticks(Math.min(10, Math.round(innerHeight / 50)))
            .tickSize(-innerWidth)
        )
        .call((g) => g.selectAll('.tick line').attr('stroke', '#E2E8F0'))
        .call((g) => g.selectAll('.domain').remove())
        .call((g) =>
          g
            .append('text')
            .attr('x', -innerHeight / 2)
            .attr('y', -52)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Labelled energy consumption (kWh/year)')
        );

    chart.append('g').call(xAxis);
    chart.append('g').call(yAxis);

    chart
      .append('g')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)
      .selectAll('circle')
      .data(dataset)
      .join('circle')
      .attr('cx', (d) => xScale(d.starRating))
      .attr('cy', (d) => yScale(d.energy))
      .attr('r', (d) => Math.max(3.5, Math.min(8, d.screenSize / 14)))
      .attr('fill', (d) => palette.get(d.tech))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d) => d3.color(palette.get(d.tech)).darker(0.6))
      .append('title')
      .text(
        (d) =>
          `${d.brand} · ${d.screenSize}" ${d.tech}\nStar rating: ${d.starRating}\nEnergy: ${d.energy.toFixed(0)} kWh`
      );

    flagChartReady(container);
  };

  const loadData = async () => {
    // Coerce the relevant columns into numbers and discard rows with missing values.
    const raw = await d3.csv(dataUrl, (d) => {
      const energy = Number(d.energy_consumpt);
      const starRating = Number(d.star2);
      const screenSize = Number(d.screensize);

      if (!Number.isFinite(energy) || !Number.isFinite(starRating)) return null;

      return {
        energy,
        starRating,
        screenSize,
        brand: d.brand,
        tech: simplifyTech(d.screen_tech),
      };
    });

    dataset = raw.filter(Boolean);
    upsertLegend(
      container,
      Array.from(palette.entries()).map(([label, colour]) => ({ label, colour })),
      'scatter'
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
