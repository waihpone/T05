import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { bindResizeListener, flagChartReady } from './chartUtils.js';

/**
 * Plots the average wholesale electricity price over time with a smooth curve
 * and interactive focus to surface exact values.
 */
export const initLineChart = (selector, dataUrl) => {
  const container = document.querySelector(selector);
  if (!container) return {};

  let dataset = [];

  const render = () => {
    if (!dataset.length) return;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const bounds = container.getBoundingClientRect();
    const width = Math.max(bounds.width, 340);
    const height = Math.max(bounds.height, 320);
    const margin = { top: 36, right: 64, bottom: 56, left: 68 };
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
      .scaleTime()
      .domain(d3.extent(dataset, (d) => d.date))
      .range([0, innerWidth]);

    const yMax = d3.max(dataset, (d) => d.value);
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.12])
      .range([innerHeight, 0])
      .nice();

    const xAxis = (g) =>
      g
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(xScale).ticks(Math.min(10, Math.round(innerWidth / 80)))
        )
        .call((g) => g.selectAll('.tick line').attr('stroke', '#E2E8F0'))
        .call((g) =>
          g
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 42)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .text('Year')
        );

    const yAxis = (g) =>
      g
        .call(d3.axisLeft(yScale).ticks(Math.min(10, Math.round(innerHeight / 60))))
        .call((g) => g.selectAll('.tick line').clone().attr('x2', innerWidth).attr('stroke', '#E2E8F0'))
        .call((g) => g.select('.domain').remove())
        .call((g) =>
          g
            .append('text')
            .attr('x', -innerHeight / 2)
            .attr('y', -52)
            .attr('fill', '#52606d')
            .attr('font-weight', 600)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Average spot price ($ per MWh)')
        );

    chart.append('g').call(xAxis);
    chart.append('g').call(yAxis);

    const gradientId = 'line-gradient';
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#EC4899')
      .attr('stop-opacity', 0.35);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#EC4899')
      .attr('stop-opacity', 0);

    const area = d3
      .area()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    chart
      .append('path')
      .datum(dataset)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    const line = d3
      .line()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    chart
      .append('path')
      .datum(dataset)
      .attr('fill', 'none')
      .attr('stroke', '#EC4899')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    // Highlight notable peak years to guide interpretation.
    const highlightYears = new Set([2017, 2022]);
    chart
      .append('g')
      .selectAll('circle')
      .data(dataset.filter((d) => highlightYears.has(d.year)))
      .join('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 5)
      .attr('fill', '#ef2f88')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .append('title')
      .text((d) => `${d.year}: $${d.value.toFixed(0)} per MWh`);

    const focusPoints = chart
      .append('g')
      .selectAll('circle')
      .data(dataset)
      .join('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 3)
      .attr('fill', '#EC4899')
      .attr('opacity', (d, i) => (i === dataset.length - 1 ? 1 : 0.5));

    focusPoints
      .append('title')
      .text((d) => `${d.year}: $${d.value.toFixed(0)} per MWh`);

    const latest = dataset[dataset.length - 1];

    const latestX = xScale(latest.date);
    const latestY = yScale(latest.value);
    const labelOffsetX = latestX > innerWidth * 0.7 ? -20 : 20;
    const latestLabelX = clamp(latestX + labelOffsetX, 18, innerWidth - 18);
    const latestAnchor = labelOffsetX < 0 ? 'end' : 'start';

    chart
      .append('text')
      .attr('x', latestLabelX)
      .attr('y', clamp(latestY - 28, 22, innerHeight - 22))
      .attr('fill', '#EC4899')
      .attr('font-weight', 700)
      .attr('font-size', 14)
      .attr('text-anchor', latestAnchor)
      .text(`2024 average: $${latest.value.toFixed(0)}`);

    // Interactive focus label for keyboard and pointer users.
    const bisectDate = d3.bisector((d) => d.date).center;
    const focus = chart.append('g').style('display', 'none');

    focus
      .append('circle')
      .attr('r', 6)
      .attr('fill', '#ffffff')
      .attr('stroke', '#ec4899')
      .attr('stroke-width', 2);

    const focusLabel = focus
      .append('text')
      .attr('dy', -12)
      .attr('font-weight', 600)
      .attr('fill', '#334155');

    const listenArea = chart
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseenter', () => focus.style('display', null))
      .on('mouseleave', () => focus.style('display', 'none'))
      .on('mousemove', handlePointer)
      .on('touchmove', handlePointer);

    function handlePointer(event) {
      if (event.type === 'touchmove' && event.preventDefault) {
        event.preventDefault();
      }

      const [x] = d3.pointer(event, this);
      const date = xScale.invert(x);
      const index = bisectDate(dataset, date);
      const datum = dataset[index];
      if (!datum) return;

      const xPos = clamp(xScale(datum.date), 0, innerWidth);
      const yPos = clamp(yScale(datum.value), 0, innerHeight);
      focus.attr('transform', `translate(${xPos},${yPos})`);

      const labelOnRight = xPos > innerWidth * 0.7;
      focusLabel
        .attr('dx', labelOnRight ? -12 : 12)
        .attr('text-anchor', labelOnRight ? 'end' : 'start')
        .text(`${datum.year}: $${datum.value.toFixed(0)}`);
    }

    listenArea.attr('aria-label', 'Hover or use touch to inspect price values by year');

    flagChartReady(container);
  };

  const loadData = async () => {
    // Coerce numeric fields and build Date objects for the temporal axis.
    const raw = await d3.csv(dataUrl, (d) => {
      const yearNumber = Number(d.Year);
      const value = Number(d['Average Price (notTas-Snowy)']);
      if (!Number.isFinite(yearNumber) || !Number.isFinite(value)) return null;

      return {
        year: yearNumber,
        date: new Date(yearNumber, 0, 1),
        value,
      };
    });

    dataset = raw.filter(Boolean).sort((a, b) => a.year - b.year);
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
