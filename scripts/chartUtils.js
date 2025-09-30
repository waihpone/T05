// Shared utilities to keep the chart modules lean and consistent.

/** Colour palette used across every chart to keep the legend consistent. */
export const SCREEN_TECH_PALETTE = Object.freeze({
  LCD: '#2563eb',
  LED: '#f97316',
  OLED: '#16a34a',
});

/**
 * Adds or updates a legend element underneath the provided chart container.
 * Each item shows the supplied label and colour swatch.
 */
export const upsertLegend = (container, entries, chartId) => {
  const parent = container.parentElement;
  if (!parent) return;

  let legend = parent.querySelector(`.chart-legend[data-chart="${chartId}"]`);
  if (!legend) {
    legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.dataset.chart = chartId;
    parent.append(legend);
  }

  legend.innerHTML = '';
  entries.forEach(({ label, colour }) => {
    const item = document.createElement('span');
    item.className = 'chart-legend__item';
    item.innerHTML = `<span class="chart-legend__swatch" style="background:${colour}"></span>${label}`;
    legend.appendChild(item);
  });
};

/**
 * Helper that renders the chart whenever the container size changes.
 * Returns a cleanup function the caller should invoke during teardown.
 */
export const bindResizeListener = (container, renderFn) => {
  if (!container) return () => {};

  let frame = null;
  const scheduleRender = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = null;
      renderFn();
    });
  };

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => scheduleRender());
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }

  const handler = () => scheduleRender();
  window.addEventListener('resize', handler);
  return () => {
    window.removeEventListener('resize', handler);
    if (frame) cancelAnimationFrame(frame);
  };
};

/** Marks a chart container as ready so the loading placeholder can fade out. */
export const flagChartReady = (container) => {
  if (container) {
    container.classList.add('is-ready');
  }
};
